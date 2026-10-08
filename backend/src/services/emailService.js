import nodemailer from "nodemailer";

/**
 * Checks whether SMTP credentials are fully configured in process.env
 */
export function isSmtpConfigured() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(
    SMTP_HOST &&
      SMTP_HOST.trim() !== "" &&
      SMTP_PORT &&
      SMTP_USER &&
      SMTP_USER.trim() !== "" &&
      SMTP_PASS &&
      SMTP_PASS.trim() !== "",
  );
}

/**
 * Creates a Nodemailer transport if SMTP is configured, otherwise null
 */
function getTransporter() {
  if (!isSmtpConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS.trim(),
    },
  });
}

/**
 * Builds clean HTML email layout for the Sunday Weekly Performance & Training Digest
 */
export function buildWeeklyDigestHtml({
  athleteName,
  review,
  plan,
  lastWeekSessions = [],
}) {
  const name = athleteName || "Athlete";
  const fromDate = review?.weekStart || "Last Week";
  const toDate = review?.weekEnd || "Today";
  const adherence = review?.adherencePercentage ?? 0;
  const plannedCount = review?.plannedSessions ?? 7;
  const completedCount = review?.completedSessions ?? 0;
  const avgRpe = review?.averageRPE ? `${review.averageRPE} / 10` : "N/A";
  const trend = review?.trend || (adherence >= 80 ? "Improving" : "Consistent");
  const recommendation =
    review?.recommendation ||
    "Maintain consistent daily warmups, proper hydration, and neurological recovery between high-intensity sprint sessions.";

  const nextWeekStart = plan?.weekStart || "Upcoming Week";
  const nextWeekEnd = plan?.weekEnd || "";
  const days = plan?.days || [];

  // Generate HTML for 7-day upcoming workout cards
  const daysHtml = days
    .map((day) => {
      const isRest = day.sessionType?.toLowerCase().includes("rest") || day.expectedDuration === 0;
      const bg = isRest ? "#f8fafc" : "#ffffff";
      const border = isRest ? "#cbd5e1" : "#ea580c";
      const tagColor = isRest ? "#64748b" : "#ea580c";

      const exercisesList = (day.exercises || [])
        .map(
          (ex) => `
          <li style="margin-bottom: 6px; font-size: 13px; color: #334155;">
            <strong>${ex.name}</strong> — ${ex.sets} sets × ${ex.reps || "1"} ${ex.distance ? `(${ex.distance})` : ""}
            ${ex.coachingCues ? `<br/><span style="font-size: 11.5px; color: #64748b; font-style: italic;">Cue: ${ex.coachingCues}</span>` : ""}
          </li>
        `,
        )
        .join("");

      return `
        <div style="background: ${bg}; border-left: 4px solid ${border}; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${day.dayOfWeek || `Day ${day.dayIndex + 1}`} · ${day.sessionType || "Training"}</span>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${tagColor}; background: rgba(234, 88, 12, 0.08); padding: 2px 8px; border-radius: 12px;">
              ${isRest ? "Rest / Recovery" : `Target Intensity: ${day.targetIntensity || 90}%`}
            </span>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 12.5px; color: #475569;">${day.objective || ""}</p>
          ${exercisesList ? `<ul style="margin: 8px 0 0 0; padding-left: 18px;">${exercisesList}</ul>` : ""}
          ${day.coachNotes ? `<div style="margin-top: 8px; font-size: 12px; color: #475569; background: #fff7ed; padding: 6px 10px; border-radius: 6px;">💡 <strong>Note:</strong> ${day.coachNotes}</div>` : ""}
        </div>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sunday Weekly Training Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 680px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #1e2e1e 0%, #0f190e 100%); padding: 32px 28px; color: #ffffff;">
      <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: #f97316; margin-bottom: 6px;">ONE NATION ONE ATHLETE</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">Sunday Training & Performance Digest</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #a3b899;">Weekly performance analysis & upcoming 7-day training schedule</p>
    </div>

    <!-- Main Container -->
    <div style="padding: 28px;">
      <p style="font-size: 15px; color: #0f172a; margin-top: 0;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Here is your weekly performance summary for last week along with your newly adapted <strong>7-Day Training Plan</strong> for the upcoming week (${nextWeekStart}${nextWeekEnd ? ` - ${nextWeekEnd}` : ""}).</p>

      <!-- SECTION 1: LAST WEEK PERFORMANCE SUMMARY -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h2 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          📊 Last Week Performance Summary (${fromDate} - ${toDate})
        </h2>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
          <tr>
            <td width="32%" style="padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Adherence</div>
              <div style="font-size: 20px; font-weight: 800; color: #ea580c; margin-top: 4px;">${adherence}%</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${completedCount} / ${plannedCount} Sessions</div>
            </td>
            <td width="2%"></td>
            <td width="32%" style="padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Avg Exertion</div>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">${avgRpe}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">RPE Exertion</div>
            </td>
            <td width="2%"></td>
            <td width="32%" style="padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Progress Trend</div>
              <div style="font-size: 18px; font-weight: 800; color: #16a34a; margin-top: 4px;">${trend}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Consistency Mark</div>
            </td>
          </tr>
        </table>

        <div style="font-size: 13px; color: #334155; line-height: 1.5; background: #ffffff; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          💡 <strong>Coach & AI Guidance:</strong> ${recommendation}
        </div>
      </div>

      <!-- SECTION 2: UPCOMING 7-DAY TRAINING PLAN -->
      <div style="margin: 28px 0;">
        <h2 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
          🏃 Upcoming 7-Day Training Plan (${nextWeekStart})
        </h2>

        ${daysHtml || '<p style="color: #64748b; font-size: 13px;">No scheduled sessions listed for this week.</p>'}
      </div>

      <!-- CALL TO ACTION -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${process.env.APP_ORIGIN || "http://localhost:5173"}/app/training" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
          Open Training Workspace & Log Sessions →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
      <div>One Nation One Athlete · Empowering Grassroots Athletic Excellence</div>
      <div style="margin-top: 4px;">This is an automated Sunday digest sent to ${name}. Configure notification settings in your profile.</div>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Sends the weekly digest email via SMTP or logs/saves local preview if SMTP unconfigured
 */
export async function sendWeeklyDigestEmail({
  toEmail,
  athleteName,
  review,
  plan,
  lastWeekSessions = [],
}) {
  const html = buildWeeklyDigestHtml({
    athleteName,
    review,
    plan,
    lastWeekSessions,
  });

  const subject = `🏆 Sunday Digest: Your 7-Day Training Plan & Performance Review (${athleteName || "Athlete"})`;

  if (!isSmtpConfigured()) {
    console.log(`\n======================================================`);
    console.log(`[EMAIL SERVICE] SMTP not configured. Simulating Sunday Digest Email to: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Summary: Adherence ${review?.adherencePercentage ?? 0}%, Next Plan Days: ${plan?.days?.length ?? 0}`);
    console.log(`======================================================\n`);

    return {
      sent: true,
      mode: "preview",
      message: "SMTP environment variables not configured. Simulated email logged locally.",
      htmlPreview: html,
    };
  }

  const transporter = getTransporter();
  const from =
    process.env.SMTP_FROM ||
    '"One Nation One Athlete" <noreply@onenationoneathlete.org>';

  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    html,
  });

  console.log(`[EMAIL SERVICE] Sunday Digest sent via SMTP to ${toEmail}. Message ID: ${info.messageId}`);
  return { sent: true, mode: "smtp", messageId: info.messageId };
}
