import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Plus,
  HeartPulse,
  Activity,
  Clock3,
  Check,
  ShieldAlert,
  Moon,
  Zap,
  Smile,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Sparkles,
  Info,
  Droplet,
  Plane,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { PageTitle, Stat, Actions, Empty } from "../components/UI";
import { stages, dateLabel } from "../lib/forms";
import {
  getTodayRecoveryReadiness,
  getRecoveryLogs,
  postDailyRecoveryCheckIn,
} from "../lib/api";

export default function Recovery() {
  const { data, add, remove, refresh } = useOutletContext();
  const [readinessData, setReadinessData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Daily Check-in Form State
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    sleepDuration: 8.0,
    sleepQuality: "Good",
    fatigue: 3,
    stress: 3,
    mood: 8,
    soreness: 3,
    generalRecovery: 8,
    painFlag: false,
    painLevel: 0,
    painArea: "",
    previousSessionRPE: 6,
    previousSessionDifficulty: "Moderate",
    hydration: "Good",
    travel: false,
    unusualStress: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [readinessRes, logsRes] = await Promise.all([
        getTodayRecoveryReadiness().catch(() => null),
        getRecoveryLogs().catch(() => []),
      ]);
      setReadinessData(readinessRes);
      setLogs(Array.isArray(logsRes) ? logsRes : []);
    } catch (err) {
      console.error("Failed to load recovery data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    try {
      const payload = {
        ...form,
        sleepDuration: Number(form.sleepDuration),
        fatigue: Number(form.fatigue),
        stress: Number(form.stress),
        mood: Number(form.mood),
        soreness: Number(form.soreness),
        generalRecovery: Number(form.generalRecovery),
        painLevel: form.painFlag ? Number(form.painLevel) : 0,
        painArea: form.painFlag ? form.painArea : "",
        previousSessionRPE: Number(form.previousSessionRPE),
      };
      await postDailyRecoveryCheckIn(payload);
      setShowCheckInModal(false);
      await loadData();
      if (refresh) refresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to record daily check-in.");
    } finally {
      setSaving(false);
    }
  };

  // Readiness badge styling
  const getReadinessBadge = (status) => {
    switch (status) {
      case "READY":
        return {
          bg: "#10b98115",
          border: "#10b98150",
          text: "#10b981",
          icon: CheckCircle2,
          label: "READY TO TRAIN",
        };
      case "READY WITH CAUTION":
        return {
          bg: "#eab30815",
          border: "#eab30850",
          text: "#eab308",
          icon: AlertTriangle,
          label: "READY WITH CAUTION",
        };
      case "RECOVERY PRIORITY":
        return {
          bg: "#f9731615",
          border: "#f9731650",
          text: "#f97316",
          icon: Flame,
          label: "RECOVERY PRIORITY",
        };
      case "COACH REVIEW":
        return {
          bg: "#ef444415",
          border: "#ef444450",
          text: "#ef4444",
          icon: ShieldAlert,
          label: "COACH REVIEW REQUIRED",
        };
      case "LIMITED DATA":
      default:
        return {
          bg: "#64748b15",
          border: "#64748b50",
          text: "#94a3b8",
          icon: HelpCircle,
          label: "INSUFFICIENT BASELINE DATA",
        };
    }
  };

  const badge = getReadinessBadge(readinessData?.status);
  const BadgeIcon = badge.icon;
  const baseline = readinessData?.baseline;
  const trends = readinessData?.trends;

  return (
    <>
      <PageTitle
        kicker="MONITORING & ATHLETE READINESS"
        title="Recovery & Readiness Engine"
        subtitle="Daily subjective monitoring, personal baseline comparison, and training support signals."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="button orange"
              onClick={() => setShowCheckInModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Sparkles size={16} />
              Daily Check-in
            </button>
            <button
              className="button secondary"
              onClick={() => add("injuries")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={16} />
              Log Injury / Medical Note
            </button>
          </div>
        }
      />

      {/* READINESS STATUS BANNER */}
      <div
        className="panel panel-pad"
        style={{
          borderLeft: `4px solid ${badge.text}`,
          background: "var(--panel-bg, #111827)",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: badge.bg,
                  border: `1px solid ${badge.border}`,
                  color: badge.text,
                  fontWeight: 700,
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  letterSpacing: "0.5px",
                }}
              >
                <BadgeIcon size={14} />
                {badge.label}
              </span>
              <span style={{ color: "var(--text-dim, #94a3b8)", fontSize: "12px" }}>
                Score: {readinessData?.score ?? 0} / 100
              </span>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "4px 0 8px 0" }}>
              Training Readiness: {readinessData?.status || "LIMITED DATA"}
            </h2>
            <p style={{ color: "var(--text-dim, #cbd5e1)", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
              {readinessData?.recommendation || "Log 3+ daily check-ins to build your personal baseline for training guidance."}
            </p>
          </div>

          <div style={{ minWidth: "220px", background: "#0f172a", padding: "14px 18px", borderRadius: "10px", border: "1px solid #1e293b" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, marginBottom: "8px" }}>
              PRIMARY FOCUS
            </div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#f8fafc" }}>
              {readinessData?.primaryFocus || "Log Check-in"}
            </div>
            {readinessData?.reasons?.length > 0 && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#cbd5e1" }}>
                {readinessData.reasons.slice(0, 2).map((r, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    <span style={{ color: badge.text }}>•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transparent Calculation Breakdown */}
        {readinessData && (
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #334155", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>14-DAY BASELINE STATUS</span>
              <strong style={{ fontSize: "13px", color: "#f1f5f9" }}>
                {readinessData.hasBaseline ? `Built from ${readinessData.baselineCount} daily records` : "Insufficient personal baseline (< 3 days)"}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>ACUTE : CHRONIC LOAD (ACWR)</span>
              <strong style={{ fontSize: "13px", color: "#f1f5f9" }}>
                {readinessData.acwr ? `${readinessData.acwr} (${readinessData.acwrStatus || "Normal"})` : "N/A (Log sessions)"}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>PAIN / INJURY FLAG</span>
              <strong style={{ fontSize: "13px", color: readinessData.hasPainFlag ? "#ef4444" : "#10b981" }}>
                {readinessData.hasPainFlag ? `ACTIVE PAIN REPORTED` : "NO PAIN FLAGS"}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* STAT GRID WITH PERSONAL BASELINE COMPARISON */}
      <div className="stat-grid four" style={{ marginBottom: "20px" }}>
        <Stat
          label="SLEEP DURATION"
          value={readinessData?.latestLog?.sleepDuration ? `${readinessData.latestLog.sleepDuration}h` : "--"}
          detail={
            baseline?.avgSleep
              ? `vs ${baseline.avgSleep}h 14-day baseline (${readinessData.latestLog.sleepDuration >= baseline.avgSleep ? "+" : ""}${(readinessData.latestLog.sleepDuration - baseline.avgSleep).toFixed(1)}h)`
              : "Log daily sleep"
          }
          icon={Moon}
        />
        <Stat
          label="FATIGUE LEVEL"
          value={readinessData?.latestLog?.fatigue ? `${readinessData.latestLog.fatigue}/10` : "--"}
          detail={
            baseline?.avgFatigue
              ? `vs ${baseline.avgFatigue} 14-day avg (${(readinessData.latestLog.fatigue - baseline.avgFatigue).toFixed(1)} diff)`
              : "Log daily fatigue"
          }
          icon={Zap}
        />
        <Stat
          label="MUSCLE SORENESS"
          value={readinessData?.latestLog?.soreness ? `${readinessData.latestLog.soreness}/10` : "--"}
          detail={
            baseline?.avgSoreness
              ? `vs ${baseline.avgSoreness} 14-day avg`
              : "Log daily soreness"
          }
          icon={Activity}
        />
        <Stat
          label="WELLBEING / STRESS"
          value={readinessData?.latestLog?.stress ? `${readinessData.latestLog.stress}/10` : "--"}
          detail={
            baseline?.avgStress
              ? `vs ${baseline.avgStress} 14-day avg`
              : "Log daily stress"
          }
          icon={Smile}
        />
      </div>

      {/* TREND DETECTION & RECENT HISTORY */}
      {trends && (
        <div className="panel panel-pad" style={{ marginBottom: "20px" }}>
          <div className="panel-title" style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={18} color="#f97316" />
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                Athlete Recovery Trends (7 / 14 / 30 Days)
              </h2>
            </div>
            <small style={{ color: "#94a3b8" }}>Auto-detected pattern directional analysis</small>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div style={{ background: "#0f172a", padding: "12px 14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>FATIGUE TREND (7d vs 14d)</div>
              <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "4px", color: trends.fatigueTrend === "Increasing" ? "#f97316" : "#10b981" }}>
                {trends.fatigueTrend} ({trends.avgFatigue7d} / 10 7-day avg)
              </div>
            </div>

            <div style={{ background: "#0f172a", padding: "12px 14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>SLEEP TREND (7d vs 14d)</div>
              <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "4px", color: trends.sleepTrend === "Declining" ? "#f97316" : "#10b981" }}>
                {trends.sleepTrend} ({trends.avgSleep7d}h 7-day avg)
              </div>
            </div>

            <div style={{ background: "#0f172a", padding: "12px 14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>SORENESS TREND</div>
              <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "4px", color: trends.sorenessTrend === "Increasing" ? "#eab308" : "#f8fafc" }}>
                {trends.sorenessTrend} ({trends.avgSoreness7d} / 10)
              </div>
            </div>

            <div style={{ background: "#0f172a", padding: "12px 14px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>30-DAY PAIN FREQUENCY</div>
              <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "4px", color: trends.painDays7d > 0 ? "#ef4444" : "#10b981" }}>
                {trends.painDays7d} pain flags in last 7 days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECOVERY LOGS HISTORY */}
      <section className="panel panel-pad" style={{ marginBottom: "20px" }}>
        <div className="panel-title" style={{ marginBottom: "14px" }}>
          <h2>Daily Check-in Log History</h2>
          <small style={{ color: "#94a3b8" }}>{logs.length} entries recorded (Immutable history)</small>
        </div>

        {logs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155", textAlign: "left", color: "#94a3b8" }}>
                  <th style={{ padding: "8px" }}>Date</th>
                  <th style={{ padding: "8px" }}>Sleep</th>
                  <th style={{ padding: "8px" }}>Fatigue</th>
                  <th style={{ padding: "8px" }}>Soreness</th>
                  <th style={{ padding: "8px" }}>Stress</th>
                  <th style={{ padding: "8px" }}>Mood</th>
                  <th style={{ padding: "8px" }}>Pain</th>
                  <th style={{ padding: "8px" }}>Prev RPE</th>
                  <th style={{ padding: "8px" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "8px", fontWeight: 600 }}>{log.date}</td>
                    <td style={{ padding: "8px" }}>{log.sleepDuration}h ({log.sleepQuality})</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ color: log.fatigue >= 7 ? "#f97316" : "inherit" }}>
                        {log.fatigue}/10
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>{log.soreness}/10</td>
                    <td style={{ padding: "8px" }}>{log.stress}/10</td>
                    <td style={{ padding: "8px" }}>{log.mood}/10</td>
                    <td style={{ padding: "8px" }}>
                      {log.painFlag ? (
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>
                          {log.painLevel}/10 ({log.painArea || "Yes"})
                        </span>
                      ) : (
                        <span style={{ color: "#10b981" }}>No</span>
                      )}
                    </td>
                    <td style={{ padding: "8px" }}>{log.previousSessionRPE ? `${log.previousSessionRPE}/10` : "--"}</td>
                    <td style={{ padding: "8px", color: "#94a3b8", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.notes || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No daily check-ins recorded yet"
            text="Click 'Daily Check-in' above to record sleep, fatigue, soreness, and pain signals."
          />
        )}
      </section>

      {/* MEDICAL & CLINICAL SAFETY NOTICE */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", padding: "14px 18px", borderRadius: "10px", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <Info size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.5" }}>
          <strong style={{ color: "#f8fafc", display: "block", marginBottom: "2px" }}>
            Application-Level Training Support Signal (Non-Medical)
          </strong>
          This system provides training-readiness indicators based on athlete-reported subjective signals and workload analytics. It does NOT provide medical diagnoses or clinical risk scores. Pain flags require coach review and qualified sports medicine clearance.
        </div>
      </div>

      {/* INJURY & RECOVERY STAGES SECTION (PRESERVED) */}
      <div className="panel-title" style={{ marginTop: "30px", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Injuries & Clinical Clearances</h2>
        <small style={{ color: "#94a3b8" }}>Authorized medical records and return-to-play progression</small>
      </div>

      {data.injuries.length ? (
        data.injuries.map((r) => (
          <section className="panel panel-pad" key={r.id} style={{ marginBottom: "16px" }}>
            <div className="panel-title">
              <div>
                <h2>{r.title}</h2>
                <small>Started {dateLabel(r.date)}</small>
              </div>
              <Actions
                edit={() => add("injuries", r)}
                remove={() => remove("injuries", r)}
              />
            </div>
            <div className="recovery-stages">
              {stages.map((stage, i) => (
                <div
                  key={stage}
                  className={i <= stages.indexOf(r.stage) ? "complete" : ""}
                >
                  <span>
                    {i < stages.indexOf(r.stage) ? <Check size={17} /> : i + 1}
                  </span>
                  <strong>{stage}</strong>
                </div>
              ))}
            </div>
            <p style={{ marginTop: "12px" }}>
              {r.notes || "Add clinician guidance and milestone observations."}
            </p>
            <span className="pill" style={{ marginTop: "8px" }}>
              {r.cleared
                ? "Professional clearance recorded"
                : "Clearance not yet recorded"}
            </span>
          </section>
        ))
      ) : (
        <section className="panel">
          <Empty
            title="No injury records"
            text="No active or past injuries logged. Click 'Log Injury / Medical Note' to record clinician recommendations."
          />
        </section>
      )}

      {/* DAILY CHECK-IN MODAL */}
      {showCheckInModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles color="#f97316" size={20} />
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Daily Recovery Check-in</h2>
              </div>
              <button
                onClick={() => setShowCheckInModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: "#ef444420", border: "1px solid #ef4444", color: "#ef4444", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "14px" }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCheckInSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Sleep Quality</label>
                  <select
                    value={form.sleepQuality}
                    onChange={(e) => setForm({ ...form, sleepQuality: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }}
                  >
                    <option value="Poor">Poor</option>
                    <option value="Fair">Fair</option>
                    <option value="Good">Good</option>
                    <option value="Excellent">Excellent</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                  Sleep Duration: <strong>{form.sleepDuration} hrs</strong>
                </label>
                <input
                  type="range"
                  min="2"
                  max="14"
                  step="0.5"
                  value={form.sleepDuration}
                  onChange={(e) => setForm({ ...form, sleepDuration: parseFloat(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    Fatigue Level: <strong>{form.fatigue}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.fatigue}
                    onChange={(e) => setForm({ ...form, fatigue: parseInt(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    Muscle Soreness: <strong>{form.soreness}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.soreness}
                    onChange={(e) => setForm({ ...form, soreness: parseInt(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    Stress Level: <strong>{form.stress}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.stress}
                    onChange={(e) => setForm({ ...form, stress: parseInt(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    Mood / Readiness: <strong>{form.mood}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.mood}
                    onChange={(e) => setForm({ ...form, mood: parseInt(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* PAIN REPORTING SECTION */}
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "14px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={form.painFlag}
                    onChange={(e) => setForm({ ...form, painFlag: e.target.checked })}
                  />
                  <span>Are you experiencing any physical pain or sharp discomfort?</span>
                </label>

                {form.painFlag && (
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                        Pain Level: <strong>{form.painLevel}/10</strong>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={form.painLevel}
                        onChange={(e) => setForm({ ...form, painLevel: parseInt(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Body Area</label>
                      <input
                        type="text"
                        placeholder="e.g. Right Hamstring"
                        value={form.painArea}
                        onChange={(e) => setForm({ ...form, painArea: e.target.value })}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", background: "#111827", border: "1px solid #334155", color: "#fff" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PREVIOUS SESSION CONTEXT */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    Previous Session RPE: <strong>{form.previousSessionRPE}/10</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.previousSessionRPE}
                    onChange={(e) => setForm({ ...form, previousSessionRPE: parseInt(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Hydration Status</label>
                  <select
                    value={form.hydration}
                    onChange={(e) => setForm({ ...form, hydration: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }}
                  >
                    <option value="Poor">Poor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Good">Good</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Notes / Observations</label>
                <textarea
                  rows="2"
                  placeholder="Any unusual stress, travel, or sleep disturbances..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#fff", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowCheckInModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button orange"
                  disabled={saving}
                >
                  {saving ? "Saving Record..." : "Submit Check-in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
