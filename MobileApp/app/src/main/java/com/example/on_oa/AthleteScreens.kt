package com.example.on_oa

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import java.net.URLEncoder
import org.json.JSONArray
import org.json.JSONObject

internal fun MainActivity.todayScreen() {
    heading(
        "YOUR JOURNEY / TODAY",
        "LET’S GO,\n${profile.s("name",user.s("name","ATHLETE")).substringBefore(' ').uppercase()}.",
        "Small steps. Extraordinary possibilities.",
    )
    val hero =
        FrameLayout(this).apply {
            background = shape(Palette.ink, dp(26).toFloat())
            clipToOutline = true
        }
    hero.addView(TrackArt(this), FrameLayout.LayoutParams(-1, -1))
    val inner = column(24)
    inner.add(kicker("YOUR PERSONAL PROGRESS", Palette.sage))
    val scoreRow = row()
    scoreRow.add(display(insights.s("score", "—"), 82f, Palette.white), width = -2)
    scoreRow.add(label(" / 100", 18f, Palette.sage), width = -2)
    inner.add(scoreRow, top = 12)
    inner.add(
        label("Built on your effort.\nExplained, never a black box.", 14f, Palette.white),
        top = 4,
    )
    inner.add(
        action("See the breakdown    ↗") {
            tab = "Performance"
            shell()
        },
        top = 20,
    )
    hero.addView(inner)
    content.add(hero, top = 24)
    val stats = row()
    fun stat(value: String, title: String, color: Int): LinearLayout =
        column(18).apply {
            background = shape(color, dp(22).toFloat())
            add(kicker(title))
            add(display(value, 35f), top = 10)
        }
    stats.add(
        stat(
            insights.s("best", "—") + " " + profile.s("unit", "sec"),
            "PERSONAL BEST",
            Palette.sage,
        ),
        width = 0,
        weight = 1f,
    )
    stats.add(android.view.View(this), width = dp(12), height = 1)
    stats.add(
        stat(records("sessions").length().toString(), "SESSIONS LOGGED", Palette.white),
        width = 0,
        weight = 1f,
    )
    content.add(stats, top = 14)
    section("Make today count", "+ Log") { recordForm("sessions") }
    val plan = insights.optJSONArray("plan")?.optJSONObject(0)
    val box = panel()
    box.add(kicker("YOUR NEXT SESSION", Palette.orange))
    box.add(label(plan?.s("title") ?: "Build your training rhythm", 22f, bold = true), top = 10)
    box.add(
        label(
            plan?.s("detail")
                ?: "Log your first session to start building a picture of your progress.",
            14f,
            Palette.muted,
        ),
        top = 10,
    )
    box.add(
        action("Open training    →", true) {
            tab = "Train"
            shell()
        },
        top = 18,
    )
    section("A moment for wellbeing")
    val recovery = panel(Palette.sage)
    recovery.add(label(insights.s("risk", "Check in with yourself"), 19f, bold = true))
    recovery.add(
        label(
            insights.s("guidance", "Record pain and fatigue with your next session."),
            13f,
            Palette.muted,
        ),
        top = 8,
    )
    recovery.add(
        action("Recovery journal    →") {
                tab = "Recovery"
                shell()
            }
            .apply { background = shape(Color.TRANSPARENT) },
        top = 8,
    )
}

internal fun MainActivity.trainingScreen() {
    heading(
        "PUT IN THE WORK",
        "YOUR NEXT\nPERSONAL BEST.",
        "A training rhythm built around your real life.",
    )
    content.add(action("＋  Log a training session") { recordForm("sessions") }, top = 22)
    section("Your weekly plan", "Create ↗") {
        val days = insights.optJSONArray("plan") ?: JSONArray()
        if (days.length() == 0) {
            toast("Connect and refresh to generate a plan.")
            return@section
        }
        mutate(
            "/records/plans",
            "POST",
            JSONObject()
                .put("title", "My training week")
                .put("date", today())
                .put("notes", "Resource-aware rule-based suggestion. Review with your coach.")
                .put("days", days),
        )
    }
    val plans = records("plans").objects()
    if (plans.isEmpty())
        empty(
            "Your week is a blank canvas.",
            "Create a plan from your goals, equipment and recovery status. Suggestions are rule-based and should be reviewed with your coach.",
        )
    for (plan in plans.reversed()) {
        val box = panel(Palette.ink)
        box.add(kicker(plan.s("date"), Palette.sage))
        box.add(label(plan.s("title"), 23f, Palette.white, true), top = 8)
        val days = plan.optJSONArray("days") ?: JSONArray()
        for (day in days.objects()) {
            box.add(
                action(
                        (if (day.optBoolean("done")) "✓  " else "○  ") +
                            day.s("day") +
                            " · " +
                            day.s("title"),
                        true,
                    ) {
                        val copy = JSONObject(plan.toString())
                        val index = days.objects().indexOf(day)
                        copy
                            .getJSONArray("days")
                            .getJSONObject(index)
                            .put("done", !day.optBoolean("done"))
                        mutate("/records/plans/${plan.s("id")}", "PUT", copy)
                    }
                    .apply {
                        gravity = Gravity.START
                        textSize = 13f
                        contentDescription =
                            "${day.s("day")}, ${day.s("title")}, ${if(day.optBoolean("done")) "complete" else "incomplete"}. Tap to toggle."
                    },
                top = 6,
            )
            box.add(
                label("${day.s("duration")} min · ${day.s("detail")}", 12f, Palette.sage),
                top = 2,
            )
        }
        box.add(
            action("Rename plan") {
                textEdit("Plan title", plan.s("title")) { title ->
                    mutate(
                        "/records/plans/${plan.s("id")}",
                        "PUT",
                        JSONObject(plan.toString()).put("title", title),
                    )
                }
            },
            top = 16,
        )
        box.add(action("Delete plan", true) { deleteRecord("plans", plan) }, top = 8)
    }
    section("The training log")
    recordList("sessions")
}

internal fun MainActivity.recordList(kind: String) {
    val rows = records(kind).objects().sortedByDescending { it.s("date") }
    if (rows.isEmpty()) {
        empty("Start your story.", "Add your first record. Your progress belongs here.")
        return
    }
    for (record in rows) {
        val box = panel()
        box.add(
            kicker(record.s("date") + if (record.optBoolean("verified")) "  ·  VERIFIED" else "")
        )
        box.add(label(record.s("title"), 21f, bold = true), top = 8)
        val detail =
            when (kind) {
                "sessions" ->
                    "${record.s("metric")} ${record.s("unit")}  /  ${record.s("event")}\n${record.s("duration")} min · Effort ${record.s("effort")}/10"
                "expenses" ->
                    "₹${record.s("amount")}  ·  ${record.s("category")}  ·  ${record.s("status")}"
                "injuries" ->
                    record.s("stage") +
                        if (record.optBoolean("cleared")) " · Clearance recorded" else ""
                else -> "${record.s("level")}  ·  ${record.s("result")}"
            }
        box.add(label(detail, 14f, Palette.muted), top = 8)
        if (record.s("notes").isNotEmpty())
            box.add(label(record.s("notes"), 13f, Palette.muted), top = 8)
        val buttons = row()
        buttons.add(
            action("Edit record") { recordForm(kind, record) }
                .apply { background = shape(Palette.sage, dp(14).toFloat()) },
            width = 0,
            weight = 1f,
        )
        buttons.add(
            action("Delete") { deleteRecord(kind, record) }
                .apply {
                    background = shape(Color.TRANSPARENT)
                    setTextColor(Palette.muted)
                },
            width = dp(90),
        )
        box.add(buttons, top = 16)
    }
}

internal fun MainActivity.deleteRecord(kind: String, record: JSONObject) =
    confirm("Delete this record?", record.s("title")) {
        mutate("/records/$kind/${record.s("id")}", "DELETE")
    }

internal fun MainActivity.opportunitiesScreen() {
    heading(
        "OPEN NEW DOORS",
        "YOUR TALENT.\nMORE PLACES.",
        "Trials, scholarships and pathways matched to your profile.",
    )
    val applications = records("applications").objects()
    if (applications.isNotEmpty()) {
        section("Your interests")
        for (a in applications) {
            val box = panel(Palette.sage)
            box.add(label(a.s("title"), 18f, bold = true))
            box.add(kicker(a.s("status")), top = 8)
            box.add(
                action("Withdraw interest") {
                    confirm("Withdraw interest?", a.s("title")) {
                        mutate("/applications/" + URLEncoder.encode(a.s("id"), "UTF-8"), "DELETE")
                    }
                },
                top = 12,
            )
        }
    }
    section("Discover your next step")
    val list = records("opportunities").objects()
    if (list.isEmpty())
        empty(
            "New possibilities are on their way.",
            "Refresh when connected to see the latest available opportunities.",
        )
    for ((index, o) in list.withIndex()) {
        val box = panel(if (index % 2 == 0) Palette.ink else Palette.white)
        val light = index % 2 == 0
        val primary = if (light) Palette.white else Palette.ink
        val secondary = if (light) Palette.sage else Palette.muted
        box.add(
            kicker(
                o.s("type") + if (o.optBoolean("sample")) " / ILLUSTRATIVE" else " / COMMUNITY",
                if (light) 0xFFFFAC88.toInt() else Palette.orange,
            )
        )
        box.add(display(o.s("title").uppercase(), 32f, primary), top = 14)
        box.add(label(o.s("location") + "  ·  " + o.s("sport"), 13f, secondary), top = 10)
        box.add(label(o.s("description"), 14f, secondary), top = 12)
        box.add(kicker("DEADLINE  /  " + o.s("deadline"), secondary), top = 16)
        val reasons =
            (o.optJSONArray("reasons") ?: JSONArray()).let { a ->
                (0 until a.length()).joinToString(" · ") { a.optString(it) }
            }
        if (reasons.isNotEmpty()) box.add(label(reasons, 12f, secondary), top = 10)
        val exists = applications.any { it.s("opportunityId") == o.s("id") }
        if (!exists && o.optBoolean("eligible"))
            box.add(
                action("Register interest    ↗") {
                    mutate("/applications", "POST", JSONObject().put("opportunityId", o.s("id")))
                },
                top = 18,
            )
        else
            box.add(
                label(
                    if (exists) "✓ Interest registered"
                    else
                        (o.optJSONArray("blockers") ?: JSONArray()).let { a ->
                            (0 until a.length()).joinToString(" · ") { a.optString(it) }
                        },
                    13f,
                    secondary,
                ),
                top = 14,
            )
    }
}

internal fun MainActivity.passportScreen() {
    heading(
        "YOUR SPORTING IDENTITY",
        "ONE ATHLETE.\nONE STORY.",
        "A home for every milestone along the way.",
    )
    val pass = panel(Palette.ink)
    pass.add(kicker("IND  /  ATHLETE DIGITAL PASSPORT", Palette.sage))
    pass.add(display(profile.s("name", user.s("name")).uppercase(), 38f, Palette.white), top = 28)
    pass.add(
        label(
            "${profile.s("sport","Athletics")}   /   ${profile.s("event","100m")}",
            16f,
            Palette.white,
        ),
        top = 12,
    )
    pass.add(
        label(
            listOf(profile.s("district"), profile.s("state"))
                .filter { it.isNotEmpty() }
                .joinToString(", ")
                .ifEmpty { "Add your home region" },
            13f,
            Palette.sage,
        ),
        top = 8,
    )
    pass.add(kicker("CATEGORY  /  " + profile.s("classification", "Open"), Palette.sage), top = 24)
    pass.add(label("━━━━━━━━━━━━━━━━━━━━\n${userId()}", 10f, Palette.sage), top = 22)
    content.add(action("Edit profile & privacy    ↗") { profileForm() }, top = 16)
    section("Your milestones", "+ Add") { recordForm("achievements") }
    recordList("achievements")
    section("Your journey, in order")
    val events =
        (records("achievements").objects() + records("injuries").objects()).sortedByDescending {
            it.s("date")
        }
    for (e in events) content.add(
        label(
            "●  ${e.s("date")}   ${e.s("title")}\n     ${e.s("stage",e.s("result"))}",
            14f,
            Palette.muted,
        ),
        top = 14,
    )
}

internal fun MainActivity.recoveryScreen() {
    heading(
        "RECOVER WITH INTENTION",
        "REST IS PART\nOF THE WORK.",
        "Record symptoms, follow your clinician’s plan, and see your recovery take shape.",
    )
    val status = panel(Palette.sage)
    status.add(label(insights.s("risk", "No check-ins yet"), 22f, bold = true))
    status.add(label(insights.s("guidance"), 14f, Palette.muted), top = 8)
    content.add(action("＋  Add a recovery record") { recordForm("injuries") }, top = 20)
    val journey = panel()
    journey.add(kicker("THE RETURN-TO-PLAY PATH"))
    journey.add(
        label(
            "01  Rest\n02  Mobility\n03  Strength\n04  Sport-specific training\n05  Fitness assessment\n06  Return to play",
            17f,
            bold = true,
        ),
        top = 14,
    )
    journey.add(
        label(
            "Risk flags are not diagnoses. Record professional clearance before returning to play.",
            12f,
            Palette.muted,
        ),
        top = 14,
    )
    recordList("injuries")
}

internal fun MainActivity.financeScreen() {
    heading(
        "INVEST IN YOUR JOURNEY",
        "BIG DREAMS.\nCLEAR NUMBERS.",
        "Keep your sporting expenses in one place.",
    )
    val total = records("expenses").objects().sumOf { it.optDouble("amount", 0.0) }
    val box = panel(Palette.ink)
    box.add(kicker("TOTAL RECORDED EXPENSES", Palette.sage))
    box.add(display("₹%,.0f".format(total), 52f, Palette.white), top = 14)
    content.add(action("＋  Add an expense") { recordForm("expenses") }, top = 18)
    content.add(
        action("Find financial opportunities    ↗", true) {
            tab = "Explore"
            shell()
        },
        top = 10,
    )
    recordList("expenses")
}

internal fun MainActivity.performanceScreen() {
    heading(
        "THE BIGGER PICTURE",
        "PROGRESS,\nMADE VISIBLE.",
        "Your numbers, with the context they deserve.",
    )
    val measured =
        records("sessions")
            .objects()
            .filter { it.s("event") == profile.s("event") && it.s("unit") == profile.s("unit") }
            .sortedBy { it.s("date") }
    val chart = panel()
    chart.add(kicker("${profile.s("event")}  /  ${profile.s("unit")}"))
    chart.add(
        ProgressPlot(this, measured.map { it.optDouble("metric").toFloat() }),
        height = dp(150),
        top = 12,
    )
    chart.add(
        label(
            if (measured.isEmpty()) "Log a result to start your trend."
            else "Oldest → newest · Same event and unit only",
            12f,
            Palette.muted,
        ),
        top = 8,
    )
    section("No mystery scores")
    for (d in insights.optJSONArray("dimensions")?.objects() ?: emptyList()) {
        val box = panel()
        box.add(label("${d.s("name")}  ·  ${d.s("weight")}% weight", 18f, bold = true))
        box.add(
            ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                max = 100
                progress = d.optDouble("value").toInt()
                progressTintList = ColorStateList.valueOf(Palette.orange)
                progressBackgroundTintList = ColorStateList.valueOf(Palette.line)
            },
            height = dp(8),
            top = 14,
        )
        box.add(label(d.s("explanation"), 13f, Palette.muted), top = 12)
    }
    val benchmark = data.optJSONObject("benchmarks")
    section("Peer benchmarks")
    val box = panel(Palette.sage)
    box.add(label("Verified, comparable peers", 18f, bold = true))
    box.add(
        label(
            "Benchmarks require consent and at least five comparable verified peers. These are dataset comparisons, not national rankings.",
            13f,
            Palette.muted,
        ),
        top = 8,
    )
    box.add(kicker("AGE BAND  /  " + (benchmark?.s("ageBand") ?: "Unknown")), top = 16)
    for (group in benchmark?.optJSONArray("groups")?.objects() ?: emptyList()) {
        box.add(label(group.s("scope"), 16f, bold = true), top = 16)
        box.add(
            label(
                if (group.isNull("percentile")) "Not enough comparable data yet"
                else "${group.s("percentile")}th percentile · ${group.s("count")} verified peers",
                13f,
                Palette.muted,
            ),
            top = 4,
        )
    }
}

internal fun MainActivity.moreScreen() {
    heading(
        "YOUR WHOLE JOURNEY",
        "BEYOND\nTHE FINISH LINE.",
        "Everything you need, on and off the field.",
    )
    for ((title, detail) in
        listOf(
            "Performance" to "Progress charts & transparent scoring",
            "Recovery" to "Wellbeing & return-to-play milestones",
            "Finance" to "Expenses, funding & possibilities",
        )) {
        val box = panel()
        box.add(label(title, 23f, bold = true))
        box.add(label(detail, 13f, Palette.muted), top = 7)
        box.add(
            action("Open $title    →", true) {
                tab = title
                shell()
            },
            top = 14,
        )
    }
    val video = panel(Palette.sage)
    video.add(kicker("VIDEO LAB"))
    video.add(display("TALENT IN\nMOTION.", 34f), top = 10)
    video.add(
        label(
            "Upload clips and certificates, replay your movement, and carry your sporting evidence with you.",
            13f,
            Palette.muted,
        ),
        top = 10,
    )
    video.add(
        action("Open video & documents    →") {
            tab = "Video"
            shell()
        },
        top = 16,
    )
    section("Your next chapter")
    val career = panel()
    career.add(label("Athlete → Coach → Analyst", 22f, bold = true))
    career.add(
        label(
            "Explore coaching, officiating, fitness and sports management. Build from your education and experience.",
            14f,
            Palette.muted,
        ),
        top = 10,
    )
    career.add(
        action("Set a career goal") {
            textEdit("My next chapter", profile.s("goal")) { goal -> profileForm(goal) }
        },
        top = 14,
    )
    if (user.s("role") != "athlete")
        content.add(action("Coach & organiser web workspace    ↗", true) { openWeb() }, top = 16)
    section("Make it yours")
    content.add(action("Profile & sharing permissions", true) { profileForm() }, top = 10)
    content.add(action("Connection settings") { connectionForm() }, top = 10)
    content.add(action("Export my athlete data") { exportPassport() }, top = 10)
    content.add(
        action("Log out", true) {
            job(
                { api.request("/auth/logout", "POST", JSONObject()) },
                {
                    api.logout()
                    user = JSONObject()
                    data = JSONObject()
                    welcome()
                },
                { error ->
                    if (error is java.io.IOException) {
                        api.logout()
                        user = JSONObject()
                        data = JSONObject()
                        welcome()
                        toast("Signed out on this device.")
                    } else message("Sign out", error.message ?: "Try again.")
                },
            )
        },
        top = 10,
    )
    content.add(
        action("Delete my account") {
                confirm(
                    "Delete your account?",
                    "This permanently removes your account and its records from the shared backend.",
                ) {
                    val id = userId()
                    job(
                        { api.request("/account", "DELETE") },
                        {
                            api.vault.put("snapshot:${api.scope(id)}", null)
                            api.vault.put("queue:${api.scope(id)}", null)
                            api.logout()
                            user = JSONObject()
                            data = JSONObject()
                            welcome()
                        },
                    )
                }
            }
            .apply {
                background = shape(Color.TRANSPARENT)
                setTextColor(Palette.muted)
            },
        top = 12,
    )
}
