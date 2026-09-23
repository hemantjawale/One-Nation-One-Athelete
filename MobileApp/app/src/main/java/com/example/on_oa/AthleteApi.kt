package com.example.on_oa

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

/** Encrypts the session, cached athlete data and pending records using Android Keystore. */
class AthleteVault(context: Context) {
    private val prefs = context.getSharedPreferences("athlete-vault", Context.MODE_PRIVATE)
    private val key: SecretKey by lazy {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey("onona-data", null) as? SecretKey)
            ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
                .apply {
                    init(
                        KeyGenParameterSpec.Builder(
                                "onona-data",
                                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                            )
                            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                            .build()
                    )
                }
                .generateKey()
    }

    @Synchronized
    fun get(name: String): String? =
        try {
            prefs.getString(name, null)?.let {
                val parts = it.split(":")
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(
                    Cipher.DECRYPT_MODE,
                    key,
                    GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)),
                )
                String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
            }
        } catch (_: Exception) {
            null
        }

    @Synchronized
    fun put(name: String, value: String?) {
        if (value == null) {
            prefs.edit().remove(name).commit()
            return
        }
        val cipher =
            Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key) }
        prefs
            .edit()
            .putString(
                name,
                Base64.encodeToString(cipher.iv, Base64.NO_WRAP) +
                    ":" +
                    Base64.encodeToString(
                        cipher.doFinal(value.toByteArray(Charsets.UTF_8)),
                        Base64.NO_WRAP,
                    ),
            )
            .commit()
    }
}

class ApiFailure(val status: Int, message: String) : Exception(message)

class AthleteApi(context: Context) {
    val vault = AthleteVault(context)
    private val config = context.getSharedPreferences("connection", Context.MODE_PRIVATE)
    var baseUrl: String
        get() = config.getString("url", "https://one-nation-one-athelete.onrender.com")!!
        set(value) {
            config.edit().putString("url", value.trimEnd('/')).apply()
        }

    var cookie: String
        get() = vault.get("cookie") ?: ""
        set(value) = vault.put("cookie", value)

    fun request(
        path: String,
        method: String = "GET",
        body: JSONObject? = null,
        idempotency: String? = null,
    ): Any {
        val conn = URL("$baseUrl/api$path").openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 10000
            conn.readTimeout = 20000
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("Cookie", cookie)
            if (idempotency != null) conn.setRequestProperty("Idempotency-Key", idempotency)
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = conn.responseCode
            val raw =
                (if (status in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()
                    ?.use { it.readText() } ?: ""
            val json = runCatching { JSONTokener(raw).nextValue() }.getOrNull() ?: JSONObject()
            if (status !in 200..299)
                throw ApiFailure(
                    status,
                    (json as? JSONObject)?.optString("error")?.takeIf { it.isNotEmpty() }
                        ?: "Request failed ($status)",
                )
            conn.getHeaderField("Set-Cookie")?.let { cookie = it.substringBefore(';') }
            return json
        } finally {
            conn.disconnect()
        }
    }

    fun scope(userId: String) = "$baseUrl|$userId"

    fun pending(userId: String) = JSONArray(vault.get("queue:${scope(userId)}") ?: "[]")

    fun queue(userId: String, body: JSONObject, key: String = UUID.randomUUID().toString()) {
        vault.put(
            "queue:${scope(userId)}",
            pending(userId).put(JSONObject().put("key", key).put("body", body)).toString(),
        )
    }

    fun sync(userId: String) {
        while (true) {
            val rows = pending(userId)
            if (rows.length() == 0) return
            val row = rows.getJSONObject(0)
            request("/records/sessions", "POST", row.getJSONObject("body"), row.getString("key"))
            rows.remove(0)
            vault.put("queue:${scope(userId)}", rows.toString())
        }
    }

    fun snapshot(): JSONObject {
        val result = JSONObject()
        for (name in
            listOf(
                "profile",
                "insights",
                "opportunities",
                "applications",
                "benchmarks",
                "files",
            )) result.put(name, request("/$name"))
        for (kind in listOf("sessions", "achievements", "injuries", "expenses", "plans")) result
            .put(kind, request("/records/$kind"))
        return result
    }

    fun logout() {
        cookie = ""
        vault.put("user", null)
    }

    fun upload(input: java.io.InputStream, name: String, mime: String): JSONObject {
        val boundary = "onona-${UUID.randomUUID()}"
        val conn = URL("$baseUrl/api/files").openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 10000
            conn.readTimeout = 60000
            conn.setChunkedStreamingMode(8192)
            conn.setRequestProperty("Cookie", cookie)
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            val safeName = name.replace(Regex("[\\r\\n\\\"]"), "_").take(180)
            conn.outputStream.use { out ->
                out.write(
                    "--$boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"$safeName\"\r\nContent-Type: $mime\r\n\r\n"
                        .toByteArray()
                )
                val buffer = ByteArray(8192)
                var total = 0L
                while (true) {
                    val n = input.read(buffer)
                    if (n < 0) break
                    total += n
                    if (total > 50L * 1024 * 1024)
                        throw IOException("Choose a file smaller than 50 MB")
                    out.write(buffer, 0, n)
                }
                out.write("\r\n--$boundary--\r\n".toByteArray())
            }
            val status = conn.responseCode
            val raw =
                (if (status in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()
                    ?.use { it.readText() } ?: "{}"
            val result = runCatching { JSONObject(raw) }.getOrDefault(JSONObject())
            if (status !in 200..299) throw ApiFailure(status, result.s("error", "Upload failed"))
            return result
        } finally {
            conn.disconnect()
        }
    }
}

fun JSONArray.objects(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }

fun JSONObject.s(key: String, fallback: String = ""): String =
    if (isNull(key)) fallback else optString(key, fallback)
