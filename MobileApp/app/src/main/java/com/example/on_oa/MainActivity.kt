package com.example.on_oa

import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    internal lateinit var api: AthleteApi
    internal var user = JSONObject()
    internal var data = JSONObject()
    internal var tab = "Today"
    internal var offline = false
    internal var busy = false
    internal lateinit var content: LinearLayout
    private lateinit var root: LinearLayout
    private lateinit var progress: ProgressBar
    private val worker = Executors.newSingleThreadExecutor()
    internal val exportLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri
            ->
            if (uri != null)
                job(
                    {
                        val exportContent = (api.request("/export") as JSONObject).toString(2)
                        contentResolver.openOutputStream(uri)?.use {
                            it.write(exportContent.toByteArray(Charsets.UTF_8))
                        } ?: error("Could not open destination")
                    },
                    { toast("Passport exported") },
                )
        }
    internal val filePicker =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) uploadDocument(uri)
        }
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    internal val profile
        get() = data.optJSONObject("profile") ?: JSONObject()

    internal val insights
        get() = data.optJSONObject("insights") ?: JSONObject()

    internal fun records(kind: String) = data.optJSONArray(kind) ?: JSONArray()

    internal fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    internal fun userId() = user.s("id")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }
        api = AthleteApi(this)
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (userId().isNotEmpty() && tab != "Today") {
                        tab = "Today"
                        shell()
                    } else finish()
                }
            },
        )
        tab = savedInstanceState?.getString("tab") ?: "Today"
        api.vault.get("user")?.let { user = JSONObject(it) }
        if (userId().isNotEmpty() && api.cookie.isNotEmpty()) {
            api.vault.get("snapshot:${api.scope(userId())}")?.let { data = JSONObject(it) }
            shell()
            refresh()
        } else welcome()
        val manager = getSystemService(ConnectivityManager::class.java)
        networkCallback =
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    runOnUiThread {
                        if (!isDestroyed && userId().isNotEmpty() && !busy && offline) refresh()
                    }
                }
            }
        manager.registerDefaultNetworkCallback(networkCallback!!)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("tab", tab)
    }

    override fun onDestroy() {
        networkCallback?.let {
            getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(it)
        }
        worker.shutdown()
        super.onDestroy()
    }

    internal fun job(
        task: () -> Unit,
        success: () -> Unit,
        failure: ((Exception) -> Unit)? = null,
    ) {
        if (busy) {
            toast("Please wait for the current action.")
            return
        }
        busy = true
        if (::progress.isInitialized) progress.visibility = View.VISIBLE
        worker.execute {
            try {
                task()
                runOnUiThread {
                    if (!isDestroyed) {
                        busy = false
                        progress.visibility = View.GONE
                        success()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    if (!isDestroyed) {
                        busy = false
                        progress.visibility = View.GONE
                        if (failure != null) failure(e)
                        else if (e is ApiFailure && e.status == 401) {
                            api.logout()
                            user = JSONObject()
                            welcome()
                            toast("Session expired. Sign in again.")
                        } else
                            message(
                                "Couldn't complete that",
                                e.message ?: "Check your connection and try again.",
                            )
                    }
                }
            }
        }
    }

    internal fun refresh() {
        if (busy) return
        var fresh = JSONObject()
        job(
            {
                api.request("/me")
                api.sync(userId())
                fresh = api.snapshot()
                api.vault.put("snapshot:${api.scope(userId())}", fresh.toString())
            },
            {
                data = fresh
                offline = false
                shell()
            },
            { error ->
                if (error is IOException) {
                    offline = true
                    shell()
                    toast("Offline · showing saved data. New sessions can be queued.")
                } else if (error is ApiFailure && error.status == 401) {
                    api.logout()
                    user = JSONObject()
                    data = JSONObject()
                    welcome()
                    toast("Please sign in again.")
                } else message("Sync needs attention", error.message ?: "Try again.")
            },
        )
    }

    internal fun mutate(
        path: String,
        method: String,
        body: JSONObject? = null,
        done: (() -> Unit)? = null,
    ) {
        job(
            { api.request(path, method, body) },
            {
                toast("Saved")
                if (done != null) done() else refresh()
            },
        )
    }

    internal fun toast(text: String) = Toast.makeText(this, text, Toast.LENGTH_LONG).show()

    internal fun message(title: String, text: String) {
        MaterialAlertDialogBuilder(this)
            .setTitle(title)
            .setMessage(text)
            .setPositiveButton("Got it", null)
            .show()
    }

    internal fun confirm(title: String, detail: String, action: () -> Unit) {
        MaterialAlertDialogBuilder(this)
            .setTitle(title)
            .setMessage(detail)
            .setNegativeButton("Keep it", null)
            .setPositiveButton("Delete") { _, _ -> action() }
            .show()
    }

    internal fun openWeb(path: String = "/app") {
        // The production backend serves the web build. The local Vite server uses port 5173.
        val uri = Uri.parse(api.baseUrl)
        val base =
            if (BuildConfig.DEBUG && uri.port == 4000)
                uri.buildUpon().encodedAuthority("${uri.host}:5173").build().toString()
            else api.baseUrl
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(base + path)))
        } catch (_: Exception) {
            toast("Install a browser to open the web workspace.")
        }
    }

    private fun base() {
        if (::root.isInitialized) root.removeAllViews()
        else {
            root = column().apply { setBackgroundColor(Palette.paper) }
            ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
                val bars =
                    insets.getInsets(
                        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime()
                    )
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                insets
            }
            setContentView(root)
        }
        root.post { ViewCompat.requestApplyInsets(root) }
        progress =
            ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                isIndeterminate = true
                indeterminateTintList = android.content.res.ColorStateList.valueOf(Palette.orange)
                visibility = if (busy) View.VISIBLE else View.GONE
            }
        root.add(progress, height = dp(3))
    }

    internal fun shell() {
        base()
        val top = row().apply { setPadding(dp(24), dp(16), dp(20), dp(14)) }
        top.add(kicker("///  ONE NATION\n      ONE ATHLETE", Palette.ink), width = 0, weight = 1f)
        top.add(label(if (offline) "○ Offline" else "● Connected", 10f, Palette.muted), width = -2)
        val sync =
            action("↻") { refresh() }
                .apply {
                    contentDescription = "Refresh and sync"
                    background = shape(Palette.sage, dp(30).toFloat())
                }
        top.add(sync, width = dp(50), height = dp(48))
        root.add(top)
        val scroller =
            ScrollView(this).apply {
                isFillViewport = true
                clipToPadding = false
            }
        content = column(24)
        scroller.addView(content)
        root.add(scroller, height = 0, weight = 1f)
        if (user.optBoolean("demo"))
            content.add(kicker("DEMO WORKSPACE  /  YOUR OWN SAMPLE DATA"), top = 2)
        if (offline)
            content.add(
                label(
                    "Saved on this device. Reconnect to update your records.",
                    12f,
                    Palette.muted,
                ),
                top = 8,
            )
        val queued = api.pending(userId()).length()
        if (queued > 0)
            content.add(
                label("$queued training session(s) waiting to sync", 12f, Palette.orange, true),
                top = 8,
            )
        when (tab) {
            "Today" -> todayScreen()
            "Train" -> trainingScreen()
            "Explore" -> opportunitiesScreen()
            "Passport" -> passportScreen()
            "Recovery" -> recoveryScreen()
            "Finance" -> financeScreen()
            "Performance" -> performanceScreen()
            "Video" -> videoScreen()
            else -> moreScreen()
        }
        content.add(
            label("EVERY ATHLETE. EVERY POSSIBILITY.", 9f, Palette.muted).apply {
                letterSpacing = .15f
                gravity = Gravity.CENTER
            },
            top = 32,
        )
        val nav =
            row().apply {
                setPadding(dp(8), dp(9), dp(8), dp(8))
                background = shape(Palette.white, 0f)
            }
        for (name in listOf("Today", "Train", "Explore", "Passport", "More")) {
            val selected =
                name == tab ||
                    (name == "More" && tab !in listOf("Today", "Train", "Explore", "Passport"))
            val item =
                column().apply {
                    gravity = Gravity.CENTER
                    isClickable = true
                    isFocusable = true
                    contentDescription = name
                    background =
                        shape(if (selected) Palette.sage else Color.TRANSPARENT, dp(18).toFloat())
                    setPadding(0, dp(9), 0, dp(8))
                    setOnClickListener {
                        tab = name
                        shell()
                    }
                    isSelected = selected
                }
            item.add(
                SportIcon(this, name, if (selected) Palette.ink else Palette.muted),
                dp(23),
                dp(23),
            )
            item.add(
                label(name, 10f, if (selected) Palette.ink else Palette.muted, selected),
                width = -2,
                top = 4,
            )
            nav.add(item, width = 0, weight = 1f)
        }
        root.add(nav)
    }

    internal fun heading(eyebrow: String, title: String, sub: String = "") {
        content.add(kicker(eyebrow), top = 24)
        content.add(display(title), top = 10)
        if (sub.isNotEmpty()) content.add(label(sub, 14f, Palette.muted), top = 12)
    }

    internal fun panel(color: Int = Palette.white, target: LinearLayout = content): LinearLayout {
        val box = column(20).apply { background = shape(color, dp(24).toFloat()) }
        target.add(box, top = 16)
        return box
    }

    internal fun section(title: String, link: String? = null, click: (() -> Unit)? = null) {
        val r = row()
        r.add(label(title, 20f, bold = true), width = 0, weight = 1f)
        if (link != null)
            r.add(
                action(link) { click?.invoke() }
                    .apply {
                        textSize = 11f
                        background = shape(Color.TRANSPARENT)
                    },
                width = -2,
            )
        content.add(r, top = 24)
    }

    internal fun empty(title: String, detail: String) {
        val box = panel(Palette.sage)
        box.add(label(title, 18f, bold = true))
        box.add(label(detail, 13f, Palette.muted), top = 8)
    }

    internal fun welcome() {
        base()
        val scroll = ScrollView(this)
        val page = column(24)
        scroll.addView(page)
        root.add(scroll, height = 0, weight = 1f)
        page.add(kicker("///  ONE NATION  ·  ONE ATHLETE", Palette.ink), top = 10)
        val hero =
            FrameLayout(this).apply {
                background = shape(Palette.ink, dp(30).toFloat())
                clipToOutline = true
            }
        val photo =
            ImageView(this).apply {
                setImageBitmap(assets.open("athlete.webp").use { BitmapFactory.decodeStream(it) })
                scaleType = ImageView.ScaleType.CENTER_CROP
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }
        hero.addView(photo, FrameLayout.LayoutParams(-1, -1))
        hero.addView(
            View(this).apply { setBackgroundColor(0x790D140C) },
            FrameLayout.LayoutParams(-1, -1),
        )
        val copy = column(24)
        copy.add(kicker("YOUR STARTING LINE. REIMAGINED.", Palette.white))
        copy.add(display("A BILLION\nDREAMS.\nNO SIDELINES.", 53f, Palette.white), top = 28)
        copy.add(
            label("Talent is everywhere.\nOpportunity should be, too.", 15f, Palette.white),
            top = 16,
        )
        hero.addView(copy, FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM))
        page.add(hero, height = dp(410), top = 24)
        page.add(label("Your sport. Your story. Your next level.", 21f, bold = true), top = 24)
        page.add(
            label(
                "A passport for your progress. A plan for your potential. Built for every athlete in India.",
                14f,
                Palette.muted,
            ),
            top = 10,
        )
        page.add(action("Start your journey    ↗") { authForm(true) }, top = 22)
        page.add(action("I already have an account", true) { authForm(false) }, top = 10)
        page.add(
            action("Explore the demo    →") { authenticate("/auth/demo", JSONObject()) }
                .apply { background = shape(Palette.sage, dp(16).toFloat()) },
            top = 10,
        )
        page.add(
            action("Connection settings") { connectionForm() }
                .apply {
                    background = shape(Color.TRANSPARENT)
                    textSize = 12f
                },
            top = 10,
        )
    }

    internal fun authenticate(path: String, body: JSONObject) {
        var result = JSONObject()
        job(
            { result = api.request(path, "POST", body) as JSONObject },
            {
                user = result.getJSONObject("user")
                api.vault.put("user", user.toString())
                data = JSONObject()
                tab = "Today"
                shell()
                refresh()
            },
        )
    }
}
