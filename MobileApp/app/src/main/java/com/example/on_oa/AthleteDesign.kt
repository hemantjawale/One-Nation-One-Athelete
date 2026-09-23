package com.example.on_oa

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.view.Gravity
import android.view.View
import android.widget.*

object Palette {
    val paper = Color.rgb(245, 242, 235)
    val ink = Color.rgb(30, 34, 30)
    val orange = Color.rgb(239, 99, 61)
    val muted = Color.rgb(109, 115, 105)
    val line = Color.rgb(220, 222, 212)
    val sage = Color.rgb(224, 229, 211)
    val white = Color.rgb(255, 254, 250)
}

fun Context.dp(n: Int) = (n * resources.displayMetrics.density).toInt()

fun shape(color: Int, radius: Float = 24f, border: Int? = null) =
    GradientDrawable().apply {
        setColor(color)
        cornerRadius = radius
        if (border != null) setStroke(1, border)
    }

fun Context.column(padding: Int = 0) =
    LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(padding), dp(padding), dp(padding), dp(padding))
    }

fun Context.row() =
    LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
    }

fun Context.label(
    value: String,
    size: Float = 14f,
    color: Int = Palette.ink,
    bold: Boolean = false,
) =
    TextView(this).apply {
        text = value
        textSize = size
        setTextColor(color)
        typeface = Typeface.create("sans-serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
        setLineSpacing(dp(3).toFloat(), 1f)
    }

fun Context.display(value: String, size: Float = 46f, color: Int = Palette.ink) =
    label(value, size, color, true).apply {
        typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
        letterSpacing = -0.035f
        setLineSpacing(0f, 0.92f)
    }

fun Context.kicker(value: String, color: Int = Palette.muted) =
    label(value.uppercase(), 10f, color, true).apply { letterSpacing = 0.17f }

fun LinearLayout.add(
    view: View,
    width: Int = -1,
    height: Int = -2,
    top: Int = 0,
    weight: Float = 0f,
) {
    addView(
        view,
        LinearLayout.LayoutParams(width, height, weight).apply { topMargin = context.dp(top) },
    )
}

fun Context.action(title: String, dark: Boolean = false, click: () -> Unit): TextView =
    label(title, 14f, if (dark) Palette.white else Palette.ink, true).apply {
        gravity = Gravity.CENTER
        minHeight = dp(52)
        setPadding(dp(18), dp(12), dp(18), dp(12))
        background =
            RippleDrawable(
                ColorStateList.valueOf(0x22000000),
                shape(if (dark) Palette.ink else Palette.orange, dp(16).toFloat()),
                null,
            )
        isClickable = true
        isFocusable = true
        setOnClickListener { click() }
    }

/** Original track-line motif, drawn natively at any density. */
class TrackArt(context: Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    override fun onDraw(c: Canvas) {
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = context.dp(1).toFloat()
        paint.color = 0x55797863
        for (i in 0..6) {
            val offset = context.dp(i * 22).toFloat()
            c.drawRoundRect(
                width * .30f + offset,
                -height * .5f + offset,
                width * 1.25f - offset,
                height * 1.4f - offset,
                width * .6f,
                width * .6f,
                paint,
            )
        }
    }
}

class SportIcon(context: Context, private val kind: String, private val tint: Int) : View(context) {
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    override fun onDraw(canvas: Canvas) {
        canvas.save()
        canvas.scale(width / 24f, height / 24f)
        p.color = tint
        p.strokeWidth = 1.7f
        p.style = Paint.Style.STROKE
        p.strokeCap = Paint.Cap.ROUND
        p.strokeJoin = Paint.Join.ROUND
        val path = Path()
        when (kind) {
            "Today" -> {
                path.moveTo(3f, 11f)
                path.lineTo(12f, 3f)
                path.lineTo(21f, 11f)
                path.moveTo(5f, 10f)
                path.lineTo(5f, 21f)
                path.lineTo(19f, 21f)
                path.lineTo(19f, 10f)
                path.moveTo(10f, 21f)
                path.lineTo(10f, 14f)
                path.lineTo(14f, 14f)
                path.lineTo(14f, 21f)
            }
            "Train" -> {
                path.moveTo(3f, 13f)
                path.lineTo(7f, 13f)
                path.lineTo(10f, 5f)
                path.lineTo(14f, 20f)
                path.lineTo(17f, 11f)
                path.lineTo(21f, 11f)
            }
            "Explore" -> {
                canvas.drawCircle(12f, 12f, 9f, p)
                path.moveTo(16f, 8f)
                path.lineTo(14f, 14f)
                path.lineTo(8f, 16f)
                path.lineTo(10f, 10f)
                path.close()
            }
            "Passport" -> {
                canvas.drawRoundRect(4f, 3f, 20f, 21f, 3f, 3f, p)
                canvas.drawCircle(12f, 9f, 3f, p)
                path.moveTo(8f, 17f)
                path.cubicTo(8f, 13f, 16f, 13f, 16f, 17f)
            }
            else -> {
                for (x in listOf(7f, 17f)) for (y in listOf(7f, 17f)) canvas.drawRoundRect(
                    x - 3,
                    y - 3,
                    x + 3,
                    y + 3,
                    1f,
                    1f,
                    p,
                )
            }
        }
        canvas.drawPath(path, p)
        canvas.restore()
    }
}

class ProgressPlot(context: Context, private val values: List<Float>) : View(context) {
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)

    init {
        contentDescription = "Performance trend: " + values.joinToString(", ")
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    }

    override fun onDraw(c: Canvas) {
        val inset = context.dp(12).toFloat()
        val w = width - inset * 2
        val h = height - inset * 2
        p.strokeWidth = 1f
        p.color = Palette.line
        for (i in 0..3) c.drawLine(inset, inset + h * i / 3, width - inset, inset + h * i / 3, p)
        if (values.isEmpty()) return
        val min = values.minOrNull()!!
        val range = (values.maxOrNull()!! - min).coerceAtLeast(1f)
        val path = Path()
        values.forEachIndexed { i, v ->
            val x = inset + w * i / (values.size - 1).coerceAtLeast(1)
            val y = inset + h * .85f - (v - min) / range * h * .7f
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        p.color = Palette.orange
        p.strokeWidth = context.dp(3).toFloat()
        p.style = Paint.Style.STROKE
        c.drawPath(path, p)
        p.style = Paint.Style.FILL
        values.forEachIndexed { i, v ->
            c.drawCircle(
                inset + w * i / (values.size - 1).coerceAtLeast(1),
                inset + h * .85f - (v - min) / range * h * .7f,
                context.dp(4).toFloat(),
                p,
            )
        }
    }
}
