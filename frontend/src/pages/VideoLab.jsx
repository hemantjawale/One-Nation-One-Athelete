import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ScanLine,
  Upload,
  FileText,
  Pencil,
  Trash2,
  Camera,
  Info,
  CheckCircle2,
  AlertTriangle,
  GitCompare,
  Sparkles,
  Link,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { PageTitle, Modal, Input } from "../components/UI";
import { field } from "../lib/forms";
import { api } from "../lib/api";
import { compressVideo } from "../lib/video";
import { analyseVideoPipeline } from "../lib/videoService";

export default function VideoLab() {
  const { data, reload, notify, confirmDelete } = useOutletContext();
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compress, setCompress] = useState(false);
  const [edit, setEdit] = useState(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareVideoId, setCompareVideoId] = useState("");
  const videoRef = useRef();

  // Video Linkage Form State
  const [linkForm, setLinkForm] = useState({
    trainingWeek: "Week 1",
    trainingDay: "Monday",
    sessionTitle: "Acceleration & Start Mechanics",
    event: "100m",
    phase: "Acceleration Development",
    requestCoachReview: true,
    notes: "",
  });

  async function upload(e) {
    let file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      notify("Maximum upload size is 50 MB.", "error");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      if (compress && file.type.startsWith("video/")) {
        notify("Compressing on this device. Keep this tab visible.");
        file = await compressVideo(file, setProgress);
      }
      const form = new FormData();
      form.append("file", file);
      const row = await api("/files", { method: "POST", body: form });
      await reload();
      if (row.mime.startsWith("video/")) setSelected(row);
      notify("File securely uploaded.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function analyse() {
    if (!Number.isFinite(videoRef.current?.duration) || !videoRef.current?.duration) {
      notify("Wait for the video to load metadata. If duration is missing, use an MP4 or WebM clip.", "error");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const analysis = await analyseVideoPipeline(videoRef.current, setProgress, {
        maxDuration: 30,
        frameStep: 0.15,
      });

      const payload = {
        name: selected.name,
        notes: linkForm.notes || selected.notes || "",
        trainingWeek: linkForm.trainingWeek,
        trainingDay: linkForm.trainingDay,
        sessionTitle: linkForm.sessionTitle,
        event: linkForm.event,
        phase: linkForm.phase,
        requestCoachReview: linkForm.requestCoachReview,
        analysis,
      };

      const row = await api("/files/" + selected.id, {
        method: "PUT",
        body: payload,
      });

      setSelected(row);
      await reload();
      notify("Multi-joint movement analysis completed successfully.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const videoFiles = data.files.filter((f) => f.mime && f.mime.startsWith("video/"));
  const currentAnalysis = selected?.analysis;
  const compareTarget = compareVideoId ? videoFiles.find((f) => f.id === compareVideoId) : null;
  const compareAnalysis = compareTarget?.analysis;

  return (
    <>
      <PageTitle
        kicker="COMPUTER VISION / SPRINT KINEMATICS"
        title="VideoLab Pose & Movement Analyzer"
        subtitle="Extract multi-joint angles, posture stability, and gait symmetry from phone recordings."
        action={
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="button secondary"
              onClick={() => setShowSetupGuide(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Camera size={16} />
              Setup Guide
            </button>

            <label className="button orange upload-button" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Upload size={16} />
              {busy ? `Working ${progress}%` : "Upload Sprint Video"}
              <input
                type="file"
                disabled={busy}
                accept="video/mp4,video/webm,image/png,image/jpeg,application/pdf"
                onChange={upload}
              />
            </label>
          </div>
        }
      />

      {/* RESPONSIBLE USE NOTICE */}
      <div className="notice" style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px" }}>
        <Info size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong>Computer-Vision Movement Measurements Notice</strong>
          <br />
          MediaPipe pose inference extracts visible 2D joint landmarks on your device. Measurements represent movement geometry, not direct indicators of sprint speed, ground reaction force, or clinical injury risk. Interpretation should be reviewed by a qualified coach.
        </div>
      </div>

      <label className="field checkbox" style={{ marginBottom: "20px" }}>
        <input
          type="checkbox"
          checked={compress}
          disabled={busy}
          onChange={(e) => setCompress(e.target.checked)}
        />
        Compress video before upload (silent 720p WebM, up to 2 minutes)
      </label>

      <div className="lab-grid">
        {/* MAIN VIDEO STAGE & MULTI-JOINT RESULTS */}
        <section className="panel video-stage">
          {selected ? (
            <>
              <video
                ref={videoRef}
                key={selected.id}
                src={"/api/files/" + selected.id + "/content"}
                controls
                playsInline
                preload="metadata"
                style={{ width: "100%", maxHeight: "420px", borderRadius: "8px 8px 0 0", background: "#000" }}
              />
              <div className="panel-pad">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px" }}>{selected.name}</h3>
                    <small style={{ color: "#94a3b8" }}>
                      Uploaded: {(selected.size / 1024 / 1024).toFixed(1)} MB • {selected.mime}
                    </small>
                  </div>
                  {videoFiles.length > 1 && (
                    <button
                      className="button secondary small"
                      onClick={() => setCompareModalOpen(true)}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <GitCompare size={14} />
                      Compare Clips
                    </button>
                  )}
                </div>

                {/* LINK VIDEO TO TRAINING SESSION */}
                <div style={{ background: "#0f172a", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#f97316", marginBottom: "8px" }}>
                    <Link size={14} />
                    <span>LINK TO TRAINING SESSION</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Training Week</label>
                      <select
                        value={linkForm.trainingWeek}
                        onChange={(e) => setLinkForm({ ...linkForm, trainingWeek: e.target.value })}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#111827", border: "1px solid #334155", color: "#fff", fontSize: "12px" }}
                      >
                        <option value="Week 1">Week 1</option>
                        <option value="Week 2">Week 2</option>
                        <option value="Week 3">Week 3</option>
                        <option value="Week 4">Week 4</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Training Session</label>
                      <input
                        type="text"
                        value={linkForm.sessionTitle}
                        onChange={(e) => setLinkForm({ ...linkForm, sessionTitle: e.target.value })}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#111827", border: "1px solid #334155", color: "#fff", fontSize: "12px" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>Phase</label>
                      <input
                        type="text"
                        value={linkForm.phase}
                        onChange={(e) => setLinkForm({ ...linkForm, phase: e.target.value })}
                        style={{ width: "100%", padding: "6px", borderRadius: "4px", background: "#111827", border: "1px solid #334155", color: "#fff", fontSize: "12px" }}
                      />
                    </div>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "10px", fontSize: "12px", color: "#cbd5e1" }}>
                    <input
                      type="checkbox"
                      checked={linkForm.requestCoachReview}
                      onChange={(e) => setLinkForm({ ...linkForm, requestCoachReview: e.target.checked })}
                    />
                    <span>Request Coach Technique Review</span>
                  </label>
                </div>

                <button
                  className="button orange"
                  disabled={busy}
                  onClick={analyse}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <ScanLine size={18} />
                  {busy ? `Analyzing Pose Kinematics ${progress}%` : "Run Multi-Joint Movement Analysis"}
                </button>

                {/* DETAILED ANALYSIS RESULTS */}
                {currentAnalysis && (
                  <div style={{ marginTop: "20px", background: "#111827", padding: "16px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                      <div>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>LANDMARK COVERAGE & CONFIDENCE</span>
                        <h4 style={{ margin: "2px 0 0 0", fontSize: "16px", color: "#f8fafc" }}>
                          {currentAnalysis.measurementCoverage}% Pose Coverage • {currentAnalysis.confidence || "Moderate"} Confidence
                        </h4>
                      </div>
                      <span className="pill" style={{ background: "#0f172a", border: "1px solid #334155", color: "#38bdf8" }}>
                        {currentAnalysis.validFrameCount || currentAnalysis.samples} Valid Frames
                      </span>
                    </div>

                    {/* Low Coverage / Quality Warning Banner */}
                    {(currentAnalysis.measurementCoverage < 50 || currentAnalysis.confidence === "Low") && (
                      <div style={{ background: "#ea580c20", border: "1px solid #ea580c80", padding: "10px 14px", borderRadius: "6px", marginBottom: "14px", color: "#fdba74", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <AlertTriangle size={16} color="#f97316" />
                        <strong>Analysis confidence/coverage is limited.</strong> Retake recording with better lighting and a full-body side view.
                      </div>
                    )}

                    {/* Joint Measurements Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>LEFT KNEE MEAN (RANGE)</span>
                        <strong style={{ display: "block", fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                          {currentAnalysis.joints?.leftKnee?.mean ?? currentAnalysis.kneeAngle ?? "--"}°
                        </strong>
                        <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                          Range: {currentAnalysis.joints?.leftKnee?.range ?? "--"}° ({currentAnalysis.joints?.leftKnee?.min ?? "--"}° to {currentAnalysis.joints?.leftKnee?.max ?? "--"}°)
                        </small>
                      </div>

                      <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>RIGHT KNEE MEAN (RANGE)</span>
                        <strong style={{ display: "block", fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                          {currentAnalysis.joints?.rightKnee?.mean ?? "--"}°
                        </strong>
                        <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                          Range: {currentAnalysis.joints?.rightKnee?.range ?? "--"}°
                        </small>
                      </div>

                      <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>KNEE EXTENSION ASYMMETRY</span>
                        <strong style={{ display: "block", fontSize: "16px", color: currentAnalysis.symmetry?.kneeMeanDiff > 10 ? "#ef4444" : "#10b981", marginTop: "2px" }}>
                          {currentAnalysis.symmetry?.kneeMeanDiff !== undefined ? `${currentAnalysis.symmetry.kneeMeanDiff}°` : "--"}
                        </strong>
                        <small style={{ color: "#94a3b8", fontSize: "11px" }}>Left vs Right extension delta</small>
                      </div>

                      <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>TRUNK VARIABILITY</span>
                        <strong style={{ display: "block", fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                          {currentAnalysis.trunkVariability || "Low"}
                        </strong>
                        <small style={{ color: "#94a3b8", fontSize: "11px" }}>Posture stability rating</small>
                      </div>
                    </div>

                    {/* Quality Warnings */}
                    {currentAnalysis.warnings?.length > 0 && (
                      <div style={{ background: "#ef444415", border: "1px solid #ef444450", padding: "10px", borderRadius: "6px", marginBottom: "10px" }}>
                        <strong style={{ fontSize: "12px", color: "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
                          <AlertTriangle size={14} /> Technique Observations & Warnings:
                        </strong>
                        <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "12px", color: "#f8fafc" }}>
                          {currentAnalysis.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Coach Annotation Section */}
                    {selected.coachAnnotation && (
                      <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #3b82f650", marginTop: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#38bdf8", fontWeight: 700, marginBottom: "6px" }}>
                          <MessageSquare size={14} />
                          <span>COACH REVIEW & ANNOTATION ({selected.coachAnnotation.annotatedBy || "Coach"})</span>
                        </div>
                        {selected.coachAnnotation.observation && (
                          <div style={{ fontSize: "13px", color: "#f8fafc", marginBottom: "4px" }}>
                            <strong>Observation:</strong> {selected.coachAnnotation.observation}
                          </div>
                        )}
                        {selected.coachAnnotation.correction && (
                          <div style={{ fontSize: "13px", color: "#f8fafc", marginBottom: "4px" }}>
                            <strong>Correction:</strong> {selected.coachAnnotation.correction}
                          </div>
                        )}
                        {selected.coachAnnotation.drillRecommendation && (
                          <div style={{ fontSize: "13px", color: "#e2e8f0" }}>
                            <strong>Recommended Drill:</strong> {selected.coachAnnotation.drillRecommendation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="video-placeholder">
              <ScanLine size={65} strokeWidth={1} />
              <h2>
                A new perspective
                <br />
                on your movement geometry.
              </h2>
              <p>
                Upload a side-view MP4 or WebM recording.
                <br />
                Keep your full body visible throughout the sprint phase.
              </p>
            </div>
          )}
        </section>

        {/* SECURE VIDEO LIBRARY */}
        <section className="panel panel-pad">
          <span className="eyebrow">YOUR SECURE ATHLETE LIBRARY</span>
          <h2>Clips & Movement History</h2>
          {data.files.length ? (
            data.files.map((f) => (
              <div className="file-row" key={f.id} style={{ borderBottom: "1px solid #1e293b", padding: "10px 0" }}>
                <FileText size={22} color={f.mime.startsWith("video/") ? "#f97316" : "#38bdf8"} />
                <div style={{ flex: 1, minWidth: 0, paddingRight: "10px" }}>
                  <button
                    className="file-name"
                    style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "#f8fafc", fontWeight: 600 }}
                    onClick={() =>
                      f.mime.startsWith("video/")
                        ? setSelected(f)
                        : window.open("/api/files/" + f.id + "/content", "_blank")
                    }
                  >
                    {f.name}
                  </button>
                  <small style={{ display: "block", color: "#94a3b8", fontSize: "11px" }}>
                    {(f.size / 1024 / 1024).toFixed(1)} MB • {f.analysis ? `Analysed (${f.analysis.measurementCoverage || 90}% coverage)` : "Uploaded"}
                    {f.requestCoachReview && !f.coachReviewedAt && <span style={{ color: "#eab308", marginLeft: "6px" }}>• Review Requested</span>}
                    {f.coachReviewedAt && <span style={{ color: "#10b981", marginLeft: "6px" }}>• Coach Reviewed</span>}
                  </small>
                </div>
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={"Edit " + f.name}
                  onClick={() => setEdit(f)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={"Delete " + f.name}
                  onClick={() =>
                    confirmDelete(async () => {
                      await api("/files/" + f.id, { method: "DELETE" });
                      if (selected?.id === f.id) setSelected(null);
                      await reload();
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: "#94a3b8" }}>Your uploaded videos and movement recordings will appear here.</p>
          )}
        </section>
      </div>

      {/* CAMERA SETUP GUIDANCE MODAL */}
      {showSetupGuide && (
        <Modal title="Recommended Recording Setup for Movement Analysis" onClose={() => setShowSetupGuide(false)}>
          <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#cbd5e1" }}>
            <p>
              To ensure optimal 2D pose landmark detection and reliable joint angle measurements, follow these recording recommendations:
            </p>
            <ul style={{ paddingLeft: "20px", margin: "10px 0" }}>
              <li><strong>Full Body Visible:</strong> Ensure head, shoulders, hips, knees, and feet remain inside the camera frame throughout the movement.</li>
              <li><strong>Side-View Angle:</strong> Position the camera perpendicular (90°) to the athlete&apos;s running lane.</li>
              <li><strong>Stable Camera:</strong> Mount the phone on a tripod or stable surface to eliminate camera shake.</li>
              <li><strong>Sufficient Lighting:</strong> Record in well-lit conditions with high contrast between the athlete and background.</li>
              <li><strong>High Frame Rate:</strong> Record at 60fps or higher if available to reduce high-speed motion blur.</li>
            </ul>
            <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px", border: "1px solid #1e293b", marginTop: "12px", fontSize: "12px", color: "#94a3b8" }}>
              ℹ️ <strong>Notice:</strong> Camera setup guidance improves landmark detection quality, but does not guarantee calibrated or 100% accurate measurements.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="button orange" onClick={() => setShowSetupGuide(false)}>
                Got it, let&apos;s analyze!
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* VIDEO COMPARISON MODAL */}
      {compareModalOpen && (
        <Modal title="Side-by-Side Video Movement Comparison" onClose={() => setCompareModalOpen(false)}>
          <div style={{ width: "100%", maxWidth: "600px" }}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                Select Comparison Video (Previous Clip)
              </label>
              <select
                value={compareVideoId}
                onChange={(e) => setCompareVideoId(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }}
              >
                <option value="">Choose a video to compare...</option>
                {videoFiles
                  .filter((f) => f.id !== selected?.id && f.analysis)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (Analysed)
                    </option>
                  ))}
              </select>
            </div>

            {compareAnalysis && currentAnalysis ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                      <th style={{ padding: "8px" }}>Metric</th>
                      <th style={{ padding: "8px" }}>Previous Clip ({compareTarget.name})</th>
                      <th style={{ padding: "8px" }}>Current Clip ({selected.name})</th>
                      <th style={{ padding: "8px" }}>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>Left Knee Mean</td>
                      <td style={{ padding: "8px" }}>{compareAnalysis.joints?.leftKnee?.mean !== undefined ? `${compareAnalysis.joints.leftKnee.mean}°` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px" }}>{currentAnalysis.joints?.leftKnee?.mean !== undefined ? `${currentAnalysis.joints.leftKnee.mean}°` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px", fontWeight: 700, color: "#f97316" }}>
                        {currentAnalysis.joints?.leftKnee?.mean !== undefined && compareAnalysis.joints?.leftKnee?.mean !== undefined
                          ? `${(currentAnalysis.joints.leftKnee.mean - compareAnalysis.joints.leftKnee.mean).toFixed(1)}°`
                          : "Insufficient Data"}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>Right Knee Mean</td>
                      <td style={{ padding: "8px" }}>{compareAnalysis.joints?.rightKnee?.mean !== undefined ? `${compareAnalysis.joints.rightKnee.mean}°` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px" }}>{currentAnalysis.joints?.rightKnee?.mean !== undefined ? `${currentAnalysis.joints.rightKnee.mean}°` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px", fontWeight: 700 }}>
                        {compareAnalysis.joints?.rightKnee?.mean !== undefined && currentAnalysis.joints?.rightKnee?.mean !== undefined
                          ? `${(currentAnalysis.joints.rightKnee.mean - compareAnalysis.joints.rightKnee.mean).toFixed(1)}°`
                          : "Insufficient Data"}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>Asymmetry Delta</td>
                      <td style={{ padding: "8px" }}>{compareAnalysis.symmetry?.kneeMeanDiff !== undefined ? `${compareAnalysis.symmetry.kneeMeanDiff}°` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px" }}>{currentAnalysis.symmetry?.kneeMeanDiff !== undefined ? `${currentAnalysis.symmetry.kneeMeanDiff}°` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px" }}>--</td>
                    </tr>

                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>Pose Coverage</td>
                      <td style={{ padding: "8px" }}>{compareAnalysis.measurementCoverage !== undefined ? `${compareAnalysis.measurementCoverage}%` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px" }}>{currentAnalysis.measurementCoverage !== undefined ? `${currentAnalysis.measurementCoverage}%` : "Insufficient Data"}</td>
                      <td style={{ padding: "8px" }}>--</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>
                Select an analyzed video above to see side-by-side metric differences.
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="button secondary" onClick={() => setCompareModalOpen(false)}>
                Close Comparison
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT FILE MODAL */}
      {edit && (
        <Modal title="Edit file details" onClose={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/files/" + edit.id, {
                  method: "PUT",
                  body: {
                    name: edit.name,
                    notes: edit.notes,
                    trainingWeek: edit.trainingWeek,
                    trainingDay: edit.trainingDay,
                    sessionTitle: edit.sessionTitle,
                    event: edit.event,
                    phase: edit.phase,
                    requestCoachReview: edit.requestCoachReview,
                    analysis: edit.analysis,
                  },
                });
                if (selected?.id === edit.id) setSelected(edit);
                await reload();
                setEdit(null);
              } catch (e) {
                notify(e.message, "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Input
              f={field("name", "File name")}
              value={edit.name}
              onChange={(v) => setEdit({ ...edit, name: v })}
            />
            <Input
              f={field("notes", "Notes", "textarea", null, true)}
              value={edit.notes || ""}
              onChange={(v) => setEdit({ ...edit, notes: v })}
            />
            <button className="button orange" disabled={busy}>
              Save file details
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
