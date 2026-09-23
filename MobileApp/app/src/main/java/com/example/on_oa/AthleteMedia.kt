package com.example.on_oa

import android.net.Uri
import android.provider.OpenableColumns
import android.widget.FrameLayout
import android.widget.MediaController
import android.widget.VideoView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import org.json.JSONObject

internal fun MainActivity.videoScreen() {
    heading(
        "YOUR MOVEMENT. YOUR EVIDENCE.",
        "TALENT\nIN MOTION.",
        "A private library for your clips and certificates.",
    )
    content.add(
        action("＋  Upload a clip or document") {
            filePicker.launch(
                arrayOf("video/mp4", "video/webm", "application/pdf", "image/jpeg", "image/png")
            )
        },
        top = 22,
    )
    content.add(
        label(
            "MP4, WebM, PDF, JPG or PNG · Up to 50 MB. Uploads require a connection.",
            12f,
            Palette.muted,
        ),
        top = 10,
    )
    val ai = panel(Palette.sage)
    ai.add(kicker("POSE ANALYSIS"))
    ai.add(label("Look closer at your technique.", 21f, bold = true), top = 10)
    ai.add(
        label(
            "The web video lab measures joint angles using MediaPipe. Analysis runs in the browser; sign in there with the same account to analyse your uploaded clips.",
            13f,
            Palette.muted,
        ),
        top = 10,
    )
    ai.add(action("Open pose analysis    ↗") { openWeb("/app/video") }, top = 14)
    section("Your secure library")
    val files = records("files").objects()
    if (files.isEmpty())
        empty(
            "Your next story starts here.",
            "Add a training clip or achievement certificate from your phone.",
        )
    for (file in files.reversed()) {
        val box = panel()
        box.add(kicker(if (file.s("mime").startsWith("video/")) "TRAINING CLIP" else "DOCUMENT"))
        box.add(label(file.s("name"), 20f, bold = true), top = 8)
        box.add(
            label("%.1f MB".format(file.optDouble("size") / 1048576), 12f, Palette.muted),
            top = 8,
        )
        if (file.s("notes").isNotEmpty())
            box.add(label(file.s("notes"), 13f, Palette.muted), top = 8)
        file.optJSONObject("analysis")?.let { a ->
            box.add(
                label(
                    "${a.s("samples")} pose samples · ${a.s("kneeAngle")}° mean knee angle",
                    14f,
                    bold = true,
                ),
                top = 12,
            )
            box.add(
                label(
                    "Browser-measured pose data; not a speed or talent prediction.",
                    12f,
                    Palette.muted,
                ),
                top = 4,
            )
        }
        if (file.s("mime").startsWith("video/"))
            box.add(action("Play clip    ▷", true) { playClip(file) }, top = 14)
        box.add(
            action("Edit name & notes") {
                form(
                    "Edit file",
                    listOf(
                        Field("name", "File name", file.s("name")),
                        Field("notes", "Notes", file.s("notes"), optional = true),
                    ),
                ) { body, dialog ->
                    body.put("analysis", file.opt("analysis") ?: JSONObject.NULL)
                    job(
                        { api.request("/files/${file.s("id")}", "PUT", body) },
                        {
                            dialog.dismiss()
                            refresh()
                        },
                    )
                }
            },
            top = 10,
        )
        box.add(
            action("Delete file", true) {
                confirm("Delete this file?", file.s("name")) {
                    mutate("/files/${file.s("id")}", "DELETE")
                }
            },
            top = 8,
        )
    }
}

internal fun MainActivity.uploadDocument(uri: Uri) {
    var name = "athlete-document"
    contentResolver
        .query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
        ?.use { cursor ->
            if (cursor.moveToFirst()) {
                name = cursor.getString(0) ?: name
                if (!cursor.isNull(1) && cursor.getLong(1) > 50L * 1024 * 1024) {
                    toast("Choose a file smaller than 50 MB")
                    return
                }
            }
        }
    job(
        {
            contentResolver.openInputStream(uri)?.use {
                api.upload(it, name, contentResolver.getType(uri) ?: "application/octet-stream")
            } ?: error("Could not read that file")
        },
        {
            toast("Upload complete")
            refresh()
        },
    )
}

internal fun MainActivity.playClip(file: JSONObject) {
    val video = VideoView(this)
    val frame = FrameLayout(this).apply { addView(video, FrameLayout.LayoutParams(-1, dp(310))) }
    val dialog =
        MaterialAlertDialogBuilder(this)
            .setTitle(file.s("name"))
            .setView(frame)
            .setPositiveButton("Done", null)
            .create()
    dialog.setOnDismissListener { video.stopPlayback() }
    dialog.show()
    video.setMediaController(MediaController(this).apply { setAnchorView(video) })
    video.setOnErrorListener { _, _, _ ->
        toast("This clip could not play. Check the connection or try the web video lab.")
        true
    }
    video.setVideoURI(
        Uri.parse("${api.baseUrl}/api/files/${file.s("id")}/content"),
        mapOf("Cookie" to api.cookie),
    )
    video.setOnPreparedListener { video.start() }
}
