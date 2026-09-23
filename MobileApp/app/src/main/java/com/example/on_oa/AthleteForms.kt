package com.example.on_oa

import android.app.DatePickerDialog
import android.text.InputType
import android.widget.*
import androidx.appcompat.app.AlertDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.io.IOException
import java.util.Calendar
import java.util.UUID
import org.json.JSONObject

internal data class Field(
    val key: String,
    val title: String,
    val initial: String = "",
    val options: List<String> = emptyList(),
    val number: Boolean = false,
    val min: Double = 0.0,
    val max: Double = 100000.0,
    val optional: Boolean = false,
    val date: Boolean = false,
    val secret: Boolean = false,
    val email: Boolean = false,
    val boolean: Boolean = false,
)

internal fun MainActivity.form(
    title: String,
    fields: List<Field>,
    submit: (JSONObject, AlertDialog) -> Unit,
) {
    val container = column(20)
    val readers = mutableMapOf<String, () -> Any>()
    val edits = mutableMapOf<String, EditText>()
    for (f in fields) {
        if (f.boolean) {
            val check =
                CheckBox(this).apply {
                    text = f.title
                    isChecked = f.initial == "true"
                    setTextColor(Palette.ink)
                    minHeight = dp(48)
                }
            container.add(check, top = 12)
            readers[f.key] = { check.isChecked }
            continue
        }
        container.add(kicker(f.title), top = 18)
        if (f.options.isNotEmpty()) {
            val spinner =
                Spinner(this).apply {
                    adapter =
                        ArrayAdapter(
                            this@form,
                            android.R.layout.simple_spinner_dropdown_item,
                            f.options,
                        )
                    setSelection(f.options.indexOf(f.initial).coerceAtLeast(0))
                    contentDescription = f.title
                }
            container.add(spinner, height = dp(52), top = 4)
            readers[f.key] = { spinner.selectedItem.toString() }
        } else {
            val edit =
                EditText(this).apply {
                    setText(f.initial)
                    textSize = 15f
                    setTextColor(Palette.ink)
                    hint = f.title
                    minHeight = dp(54)
                    setPadding(dp(14), dp(10), dp(14), dp(10))
                    background = shape(Palette.paper, dp(12).toFloat())
                    inputType =
                        when {
                            f.secret ->
                                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                            f.email ->
                                InputType.TYPE_CLASS_TEXT or
                                    InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
                            f.number ->
                                InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
                            f.key in listOf("notes", "goal") ->
                                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
                            else ->
                                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
                        }
                    if (f.secret || f.email)
                        inputType = inputType or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                    contentDescription = f.title
                }
            if (f.date) {
                edit.isFocusable = false
                edit.setOnClickListener {
                    val c = Calendar.getInstance()
                    val parts = edit.text.toString().split('-')
                    if (parts.size == 3)
                        runCatching {
                            c.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
                        }
                    DatePickerDialog(
                            this,
                            { _, y, m, d ->
                                edit.setText(
                                    String.format(
                                        java.util.Locale.US,
                                        "%04d-%02d-%02d",
                                        y,
                                        m + 1,
                                        d,
                                    )
                                )
                            },
                            c.get(Calendar.YEAR),
                            c.get(Calendar.MONTH),
                            c.get(Calendar.DAY_OF_MONTH),
                        )
                        .apply {
                            if (f.key == "birthDate")
                                datePicker.maxDate = System.currentTimeMillis()
                        }
                        .show()
                }
            }
            container.add(edit, top = 6)
            edits[f.key] = edit
            readers[f.key] = { edit.text.toString().trim() }
        }
    }
    val scroll = ScrollView(this).apply { addView(container) }
    val dialog =
        MaterialAlertDialogBuilder(this)
            .setTitle(title)
            .setView(scroll)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Save", null)
            .create()
    dialog.setOnShowListener {
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            if (busy) {
                toast("Please wait…")
                return@setOnClickListener
            }
            val body = JSONObject()
            var valid = true
            for (f in fields) {
                val value = readers.getValue(f.key)()
                var error: String? = null
                when {
                    f.boolean -> body.put(f.key, value)
                    !f.optional && value.toString().isBlank() -> error = "Required"
                    f.secret && value.toString().length < 8 -> error = "Use at least 8 characters"
                    f.email &&
                        !android.util.Patterns.EMAIL_ADDRESS.matcher(value.toString()).matches() ->
                        error = "Enter a valid email"
                    f.number -> {
                        val n = value.toString().toDoubleOrNull()
                        if (n == null || !n.isFinite() || n < f.min || n > f.max)
                            error = "Enter a number from ${f.min} to ${f.max}"
                        else body.put(f.key, n)
                    }
                    value.toString().length >
                        (if (f.key in listOf("notes", "goal")) 2000 else 300) ->
                        error = "Please shorten this value"
                    else -> body.put(f.key, value)
                }
                edits[f.key]?.error = error
                if (error != null) valid = false
            }
            if (valid) submit(body, dialog)
        }
    }
    dialog.show()
}

internal fun MainActivity.authForm(register: Boolean) {
    val fields = mutableListOf<Field>()
    if (register) fields.add(Field("name", "Your full name"))
    fields.add(Field("email", "Email address", email = true))
    fields.add(Field("password", "Password", secret = true))
    if (register)
        fields.add(
            Field("role", "I am an", "athlete", listOf("athlete", "coach", "organiser", "medical"))
        )
    form(if (register) "Your journey starts here" else "Welcome back", fields) { body, dialog ->
        var response = JSONObject()
        job(
            {
                response =
                    api.request(if (register) "/auth/register" else "/auth/login", "POST", body)
                        as JSONObject
            },
            {
                dialog.dismiss()
                user = response.getJSONObject("user")
                api.vault.put("user", user.toString())
                data = JSONObject()
                tab = "Today"
                shell()
                refresh()
            },
        )
    }
}

internal fun MainActivity.connectionForm() {
    form("Backend connection", listOf(Field("url", "Server URL", api.baseUrl))) { body, dialog ->
        val url = body.s("url").trimEnd('/')
        val uri = android.net.Uri.parse(url)
        if (
            uri.host.isNullOrBlank() ||
                uri.scheme !in
                    (if (BuildConfig.DEBUG) listOf("http", "https") else listOf("https")) ||
                !uri.userInfo.isNullOrEmpty() ||
                !uri.query.isNullOrEmpty() ||
                !uri.fragment.isNullOrEmpty() ||
                !uri.path.isNullOrEmpty()
        ) {
            toast("Use a server origin such as http://10.0.2.2:4000. Release builds require HTTPS.")
            return@form
        }
        if (url != api.baseUrl) {
            // Never forward the existing account session to a different server.
            api.logout()
            api.baseUrl = url
            user = JSONObject()
            data = JSONObject()
            welcome()
        }
        dialog.dismiss()
        toast(
            "Connection saved. Emulator: 10.0.2.2:4000. A phone needs your computer’s LAN address."
        )
    }
}

internal fun MainActivity.recordForm(kind: String, record: JSONObject? = null) {
    fun value(key: String, default: String = "") = record?.s(key, default) ?: default
    val fields =
        mutableListOf(
            Field("title", "Title", value("title")),
            Field("date", "Date", value("date", today()), date = true),
        )
    val units = listOf("sec", "m", "cm", "points", "kg")
    when (kind) {
        "sessions" ->
            fields.addAll(
                listOf(
                    Field("event", "Event", value("event", profile.s("event", "100m"))),
                    Field("unit", "Unit", value("unit", profile.s("unit", "sec")), units),
                    Field("metric", "Result", value("metric"), number = true),
                    Field(
                        "duration",
                        "Duration in minutes",
                        value("duration", "30"),
                        number = true,
                        min = 1.0,
                        max = 600.0,
                    ),
                    Field(
                        "effort",
                        "Effort · 1 to 10",
                        value("effort", "5"),
                        number = true,
                        min = 1.0,
                        max = 10.0,
                    ),
                    Field("pain", "Pain · 0 to 10", value("pain", "0"), number = true, max = 10.0),
                    Field(
                        "fatigue",
                        "Fatigue · 0 to 10",
                        value("fatigue", "0"),
                        number = true,
                        max = 10.0,
                    ),
                )
            )
        "achievements" ->
            fields.addAll(
                listOf(
                    Field(
                        "level",
                        "Level",
                        value("level", "District"),
                        listOf("School", "District", "State", "National", "International"),
                    ),
                    Field("result", "Result or placing", value("result")),
                )
            )
        "expenses" ->
            fields.addAll(
                listOf(
                    Field(
                        "amount",
                        "Amount in rupees",
                        value("amount"),
                        number = true,
                        min = 1.0,
                        max = 10000000.0,
                    ),
                    Field(
                        "category",
                        "Category",
                        value("category", "Equipment"),
                        listOf("Equipment", "Travel", "Coaching", "Nutrition", "Medical", "Other"),
                    ),
                    Field(
                        "status",
                        "Status",
                        value("status", "Planned"),
                        listOf("Planned", "Paid", "Funded"),
                    ),
                )
            )
        "injuries" ->
            fields.addAll(
                listOf(
                    Field(
                        "stage",
                        "Recovery stage",
                        value("stage", "Rest"),
                        listOf(
                            "Rest",
                            "Mobility",
                            "Strength",
                            "Sport-specific training",
                            "Fitness assessment",
                            "Return to play",
                        ),
                    ),
                    Field(
                        "cleared",
                        "Professional clearance has been recorded",
                        value("cleared", "false"),
                        boolean = true,
                    ),
                )
            )
    }
    val documents = records("files").objects().filter { !it.s("mime").startsWith("video/") }
    val documentLabels = documents.map { it.s("name") + " · " + it.s("id").take(6) }
    if (kind == "achievements") {
        val selected = documents.indexOfFirst { it.s("id") == record?.s("attachmentId") }
        fields.add(
            Field(
                "certificate",
                "Certificate from your library",
                if (selected >= 0) documentLabels[selected] else "No certificate",
                listOf("No certificate") + documentLabels,
            )
        )
    }
    fields.add(Field("notes", "Notes", value("notes"), optional = true))
    val recordName =
        mapOf(
            "sessions" to "training session",
            "achievements" to "achievement",
            "injuries" to "recovery record",
            "expenses" to "expense",
        )[kind] ?: "record"
    form(if (record == null) "Add $recordName" else "Edit record", fields) { body, dialog ->
        if (
            kind == "injuries" && body.s("stage") == "Return to play" && !body.optBoolean("cleared")
        ) {
            toast("Record professional clearance before returning to play.")
            return@form
        }
        if (kind == "achievements") {
            val selected = documentLabels.indexOf(body.s("certificate"))
            if (selected >= 0) body.put("attachmentId", documents[selected].s("id"))
            body.remove("certificate")
        }
        val key = UUID.randomUUID().toString()
        val path = "/records/$kind" + (record?.let { "/${it.s("id")}" } ?: "")
        job(
            { api.request(path, if (record == null) "POST" else "PUT", body, key) },
            {
                dialog.dismiss()
                toast("Record saved")
                refresh()
            },
            { error ->
                if (error is IOException && kind == "sessions" && record == null) {
                    api.queue(userId(), body, key)
                    offline = true
                    dialog.dismiss()
                    shell()
                    toast("Session saved on this device. It will sync when connected.")
                } else message("Record not saved", error.message ?: "Try again when connected.")
            },
        )
    }
}

internal fun MainActivity.profileForm(goal: String? = null) {
    fun v(key: String, default: String = "") = profile.s(key, default)
    val fields =
        listOf(
            Field("name", "Full name", v("name", user.s("name"))),
            Field("sport", "Sport", v("sport", "Athletics")),
            Field("event", "Event", v("event", "100m")),
            Field("unit", "Unit", v("unit", "sec"), listOf("sec", "m", "cm", "points", "kg")),
            Field("state", "State", v("state")),
            Field("district", "District", v("district"), optional = true),
            Field("birthDate", "Date of birth", v("birthDate"), date = true),
            Field(
                "gender",
                "Gender",
                v("gender", "Prefer not to say"),
                listOf("Female", "Male", "Non-binary", "Prefer not to say"),
            ),
            Field("classification", "Sport classification", v("classification", "Open")),
            Field("equipment", "Available equipment", v("equipment", "Open ground")),
            Field("target", "Performance target", v("target", "12"), number = true),
            Field("goal", "Your goals", goal ?: v("goal"), optional = true),
            Field("education", "Education", v("education"), optional = true),
            Field(
                "competitionDate",
                "Next competition date (optional)",
                v("competitionDate"),
                optional = true,
                date = true,
            ),
            Field(
                "coachId",
                "Coach or medical account email (optional)",
                v("coachId"),
                optional = true,
            ),
            Field(
                "sharePerformance",
                "Share performance with my linked coach",
                v("sharePerformance", "false"),
                boolean = true,
            ),
            Field(
                "shareHealth",
                "Share health with my linked coach or medical staff",
                v("shareHealth", "false"),
                boolean = true,
            ),
            Field(
                "allowAnalytics",
                "Include my data in anonymous cohort analytics",
                v("allowAnalytics", "false"),
                boolean = true,
            ),
        )
    form("Your profile & privacy", fields) { body, dialog ->
        job(
            { api.request("/profile", "PUT", body) },
            {
                dialog.dismiss()
                toast("Profile updated")
                refresh()
            },
        )
    }
}

internal fun MainActivity.textEdit(title: String, initial: String, save: (String) -> Unit) {
    form(title, listOf(Field("value", title, initial))) { body, dialog ->
        dialog.dismiss()
        save(body.s("value"))
    }
}

internal fun MainActivity.exportPassport() {
    exportLauncher.launch("athlete-passport.json")
}
