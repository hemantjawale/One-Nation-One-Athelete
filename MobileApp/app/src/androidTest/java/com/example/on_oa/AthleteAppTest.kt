package com.example.on_oa

import android.graphics.Bitmap
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.*
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AthleteAppTest {
    private val instrument = InstrumentationRegistry.getInstrumentation()
    private val context
        get() = instrument.targetContext

    private fun client(): AthleteApi =
        AthleteApi(context).apply { baseUrl = "http://10.0.2.2:4000" }

    private fun seed(api: AthleteApi): JSONObject {
        val user =
            (api.request("/auth/demo", "POST", JSONObject()) as JSONObject).getJSONObject("user")
        api.vault.put("user", user.toString())
        return user
    }

    private fun idle(scenario: ActivityScenario<MainActivity>) {
        repeat(200) {
            var busy = true
            scenario.onActivity { busy = it.busy }
            if (!busy) {
                instrument.waitForIdleSync()
                return
            }
            Thread.sleep(100)
        }
        fail("App did not finish its request")
    }

    private fun screenshot(name: String) {
        instrument.waitForIdleSync()
        Thread.sleep(450) // Allow the new native view tree to reach the rendered surface.
        val bitmap = instrument.uiAutomation.takeScreenshot()
        File(context.getExternalFilesDir(null), "$name.png").outputStream().use {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
        }
        bitmap.recycle()
    }

    @Test
    fun nativeScreensAndTrainingCrud() {
        val api = client()
        seed(api)
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            idle(scenario)
            screenshot("01-today")
            onView(withContentDescription("Train")).perform(click())
            onView(withText("＋  Log a training session")).perform(scrollTo(), click())
            onView(withContentDescription("Title"))
                .perform(replaceText("Android sprint test"), closeSoftKeyboard())
            onView(withContentDescription("Result"))
                .perform(scrollTo(), replaceText("12.4"), closeSoftKeyboard())
            onView(withText("Save")).perform(click())
            idle(scenario)
            var record =
                (api.request("/records/sessions") as org.json.JSONArray).objects().first {
                    it.s("title") == "Android sprint test"
                }
            scenario.onActivity { it.recordForm("sessions", record) }
            onView(withContentDescription("Title"))
                .perform(replaceText("Android updated sprint"), closeSoftKeyboard())
            onView(withText("Save")).perform(click())
            idle(scenario)
            record =
                (api.request("/records/sessions") as org.json.JSONArray).objects().first {
                    it.s("id") == record.s("id")
                }
            assertEquals("Android updated sprint", record.s("title"))
            scenario.onActivity { it.deleteRecord("sessions", record) }
            onView(withId(android.R.id.button1)).perform(click())
            idle(scenario)
            assertFalse(
                (api.request("/records/sessions") as org.json.JSONArray).objects().any {
                    it.s("id") == record.s("id")
                }
            )
            for ((index, tab) in
                listOf(
                        "Train",
                        "Explore",
                        "Passport",
                        "More",
                        "Performance",
                        "Recovery",
                        "Finance",
                        "Video",
                    )
                    .withIndex()) {
                scenario.onActivity {
                    it.tab = tab
                    it.shell()
                }
                screenshot("${index+2}-${tab.lowercase()}")
                onView(withContentDescription("Today")).check(matches(isDisplayed()))
            }
        }
        api.request("/account", "DELETE")
        api.logout()
    }

    @Test
    fun encryptedOfflineQueueIsIdempotent() {
        val api = client()
        val user = seed(api)
        val body =
            JSONObject()
                .put("title", "Offline Android test")
                .put("date", "2026-09-21")
                .put("event", "100m")
                .put("unit", "sec")
                .put("duration", 30)
                .put("effort", 5)
                .put("metric", 12.2)
                .put("pain", 0)
                .put("fatigue", 2)
                .put("notes", "")
        api.queue(user.s("id"), body, "android-retry")
        api.request("/records/sessions", "POST", body, "android-retry")
        api.sync(user.s("id"))
        api.sync(user.s("id"))
        assertEquals(0, api.pending(user.s("id")).length())
        assertEquals(
            1,
            (api.request("/records/sessions") as org.json.JSONArray).objects().count {
                it.s("title") == "Offline Android test"
            },
        )
        assertFalse(
            context.getSharedPreferences("athlete-vault", 0).all.values.any {
                it.toString().contains("Offline Android test")
            }
        )
        api.request("/account", "DELETE")
        api.logout()
    }

    @Test
    fun welcomeAndRegistrationForm() {
        val api = client()
        api.logout()
        val email = "android-${System.currentTimeMillis()}@example.test"
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            screenshot("00-welcome")
            onView(withText("Start your journey    ↗")).perform(scrollTo(), click())
            onView(withContentDescription("Your full name")).check(matches(isDisplayed()))
            onView(withText("Save")).perform(click())
            onView(withContentDescription("Your full name"))
                .check(matches(hasErrorText("Required")))
            onView(withContentDescription("Your full name"))
                .perform(replaceText("Meera Android"), closeSoftKeyboard())
            onView(withContentDescription("Email address"))
                .perform(scrollTo(), replaceText(email), closeSoftKeyboard())
            onView(withContentDescription("Password"))
                .perform(scrollTo(), replaceText("NativeTest123!"), closeSoftKeyboard())
            onView(withId(android.R.id.button1)).perform(click())
            idle(scenario)
            assertEquals(email, (api.request("/me") as JSONObject).getJSONObject("user").s("email"))
            scenario.recreate()
            idle(scenario)
            scenario.onActivity { assertEquals(email, it.user.s("email")) }
        }
        api.request("/account", "DELETE")
        api.logout()
    }

    @Test
    fun nativeUploadAndAchievementAttachment() {
        val api = client()
        seed(api)
        val upload =
            "%PDF-1.4\n% Android integration fixture\n%%EOF".byteInputStream().use {
                api.upload(it, "android-certificate.pdf", "application/pdf")
            }
        assertEquals("application/pdf", upload.s("mime"))
        val body =
            JSONObject()
                .put("title", "Android certificate test")
                .put("date", "2026-09-21")
                .put("level", "District")
                .put("result", "Finalist")
                .put("notes", "")
                .put("attachmentId", upload.s("id"))
        val achievement = api.request("/records/achievements", "POST", body) as JSONObject
        assertEquals(upload.s("id"), achievement.s("attachmentId"))
        api.request(
            "/files/${upload.s("id")}",
            "PUT",
            JSONObject().put("name", "Renamed certificate.pdf").put("notes", "Native upload"),
        )
        assertTrue(
            (api.request("/files") as org.json.JSONArray).objects().any {
                it.s("name") == "Renamed certificate.pdf"
            }
        )
        api.request("/records/achievements/${achievement.s("id")}", "DELETE")
        api.request("/files/${upload.s("id")}", "DELETE")
        assertFalse(
            (api.request("/files") as org.json.JSONArray).objects().any {
                it.s("id") == upload.s("id")
            }
        )
        api.request("/account", "DELETE")
        api.logout()
    }
}
