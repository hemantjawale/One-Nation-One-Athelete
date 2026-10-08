import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, Trash2, Lock, AlertTriangle, ArrowRight } from "lucide-react";
import { PageTitle, Input, Modal } from "../components/UI";
import { field } from "../lib/forms";
import { api } from "../lib/api";
import {
  sportsRegistry,
  getSportConfig,
  createDefaultSportProfile,
  getDefaultTargetForSport,
  normalizeProfile,
} from "../lib/sports";
import { SportSpecificFields } from "../components/SportSpecificFields";
import { ExportMenu } from "../components/ExportMenu";

export default function Profile() {
  const c = useOutletContext();
  return <ProfileForm key={c.data.profile.updatedAt || c.user.id} {...c} />;
}

function ProfileForm({ data, action, busy, notify, deleteAccount, user }) {
  const normalizedInitial = normalizeProfile(data.profile);

  // Once an athlete has a sport saved or locked, it cannot be changed
  const [isSportLocked, setIsSportLocked] = useState(() => {
    return Boolean(
      normalizedInitial.sportLocked ||
      data.profile?.sportLocked ||
      (data.profile?.id && data.profile?.sport)
    );
  });

  // 2-step confirmation modal to avoid misclicks
  const [pendingSport, setPendingSport] = useState(null);
  const [confirmStep, setConfirmStep] = useState(0); // 0 = closed, 1 = first ask, 2 = second ask
  const [finalCheckbox, setFinalCheckbox] = useState(false);

  const [athlete, setAthlete] = useState({
    name: normalizedInitial.name || "",
    birthDate: normalizedInitial.birthDate || "",
    sport: normalizedInitial.sport || "Athletics",
    sportLocked: normalizedInitial.sportLocked || false,
    event: normalizedInitial.event || "100m",
    unit: normalizedInitial.unit || "sec",
    gender: normalizedInitial.gender || "Prefer not to say",
    classification: normalizedInitial.classification || "Open",
    state: normalizedInitial.state || "",
    district: normalizedInitial.district || "",
    competitionDate: normalizedInitial.competitionDate || "",
    equipment: normalizedInitial.equipment || "",
    education: normalizedInitial.education || "",
    goal: normalizedInitial.goal || "",
  });

  const [sportProfile, setSportProfile] = useState(
    normalizedInitial.sportProfile || createDefaultSportProfile("Athletics", normalizedInitial.gender),
  );

  const [target, setTarget] = useState(normalizedInitial.target ?? 12);

  const [privacy, setPrivacy] = useState({
    coachId: normalizedInitial.coachId || "",
    sharePerformance: !!normalizedInitial.sharePerformance,
    shareHealth: !!normalizedInitial.shareHealth,
    allowAnalytics: !!normalizedInitial.allowAnalytics,
  });

  // Initiate sport change: trigger 2-step confirmation to avoid misclick
  const onInitiateSportChange = (newSportName) => {
    if (isSportLocked) {
      notify?.("Sport cannot be changed once selected. Your sport field is permanently locked.", "error");
      return;
    }
    if (newSportName === athlete.sport) return;
    setPendingSport(newSportName);
    setFinalCheckbox(false);
    setConfirmStep(1); // Ask 1: Are you sure?
  };

  const handleProceedToStep2 = () => {
    setConfirmStep(2); // Ask 2: Double check and lock
  };

  const handleFinalLockConfirm = () => {
    if (!finalCheckbox) {
      notify?.("Please check the confirmation box to verify.", "error");
      return;
    }
    const chosenSport = pendingSport;
    const config = getSportConfig(chosenSport);
    if (config) {
      const cleanSp = createDefaultSportProfile(config, athlete.gender);
      const newTarget = getDefaultTargetForSport(cleanSp);

      setAthlete((prev) => ({
        ...prev,
        sport: config.name,
        sportLocked: true,
        event: cleanSp.event,
        unit: cleanSp.measurement?.unit || "points",
      }));
      setSportProfile(cleanSp);
      setTarget(newTarget);
      setIsSportLocked(true);
    }
    setConfirmStep(0);
    setPendingSport(null);
    setFinalCheckbox(false);
    notify?.(`Primary sport locked to ${chosenSport}. Save athlete details to persist.`);
  };

  const handleCancelSportChange = () => {
    setConfirmStep(0);
    setPendingSport(null);
    setFinalCheckbox(false);
  };

  const handleSportChange = (newSportName) => {
    onInitiateSportChange(newSportName);
  };

  const handleIdentityChange = (key, val) => {
    setAthlete((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "gender") {
        const config = getSportConfig(next.sport);
        if (config && (config.id === "badminton" || config.id === "weightlifting")) {
          const reSp = createDefaultSportProfile(config, val);
          setSportProfile(reSp);
          next.event = reSp.event;
          next.unit = reSp.measurement?.unit || next.unit;
        }
      }
      return next;
    });
  };

  const identityFields = [
    field("name", "Full name"),
    field("birthDate", "Date of birth", "date"),
    field("gender", "Gender category", "select", [
      "Female",
      "Male",
      "Non-binary",
      "Prefer not to say",
    ]),
    field("state", "State / union territory"),
    field("district", "District", "text", null, true),
  ];

  const additionalFields = [
    ...(athlete.sport !== "Para athletics"
      ? [field("classification", "Classification (Open or official class)", "text", null, true)]
      : []),
    field("competitionDate", "Next competition date", "date", null, true),
    field("equipment", "Available equipment"),
    field("education", "Education", "text", null, true),
    field("goal", "Sporting / career goal", "textarea", null, true),
  ];

  const saveAthleteDetails = (e) => {
    e.preventDefault();
    const payload = normalizeProfile({
      ...athlete,
      sportLocked: isSportLocked || athlete.sportLocked || true,
      sportProfile,
      target,
      coachId: data.profile.coachId || "",
      sharePerformance: !!data.profile.sharePerformance,
      shareHealth: !!data.profile.shareHealth,
      allowAnalytics: !!data.profile.allowAnalytics,
    });

    action(
      () =>
        api("/profile", {
          method: "PUT",
          body: payload,
        }),
      "Athlete details saved.",
    );
  };

  const savePrivacyConsent = (e) => {
    e.preventDefault();
    const payload = normalizeProfile({
      ...athlete,
      sportProfile,
      target,
      ...privacy,
    });

    action(
      () =>
        api("/profile", {
          method: "PUT",
          body: payload,
        }),
      "Privacy and consent choices saved.",
    );
  };

  return (
    <>
      <PageTitle
        kicker="YOUR IDENTITY / YOUR CONTROL"
        title="Make it yours"
        subtitle="Build your profile with sport-specific criteria and choose what you share."
      />

      <form onSubmit={saveAthleteDetails}>
        <section className="panel panel-pad">
          <h2>Athlete details</h2>

          {/* Basic Identity & Location */}
          <div className="form-grid">
            {identityFields.map((f) => (
              <Input
                key={f.key}
                f={f}
                value={athlete[f.key]}
                onChange={(v) => handleIdentityChange(f.key, v)}
              />
            ))}

            {/* Primary Sport Selector with Permanent Lock & Double Confirmation */}
            <div className="field wide" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#2e3b23" }}>
                  Primary Sport {isSportLocked && <span style={{ color: "#b91c1c" }}>* (Locked)</span>}
                </span>
                {isSportLocked ? (
                  <span className="pill small danger" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}>
                    <Lock size={12} /> Permanent Sport Locked
                  </span>
                ) : (
                  <span className="pill small ghost" style={{ fontSize: 11 }}>
                    ⚠️ Select once · Permanent
                  </span>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <select
                  value={athlete.sport}
                  disabled={isSportLocked}
                  onChange={(e) => onInitiateSportChange(e.target.value)}
                  style={{
                    cursor: isSportLocked ? "not-allowed" : "pointer",
                    backgroundColor: isSportLocked ? "#f4f6f0" : "#ffffff",
                    borderColor: isSportLocked ? "#d0d7c5" : "#4b583f",
                    color: isSportLocked ? "#3d4b32" : "#1a1e24",
                    fontWeight: isSportLocked ? 600 : 400,
                    width: "100%",
                    paddingRight: isSportLocked ? 36 : undefined,
                  }}
                >
                  {Object.keys(sportsRegistry).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {isSportLocked && (
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 14,
                      pointerEvents: "none",
                    }}
                    title="Sport cannot be changed once selected"
                  >
                    🔒
                  </span>
                )}
              </div>

              {isSportLocked ? (
                <small style={{ color: "#6a775b", fontSize: 12, marginTop: 5, display: "block" }}>
                  🔒 <strong>Permanent Registration:</strong> As per athlete regulations, your sport ({athlete.sport}) cannot be changed once selected. All national records and coach plans are tied to this sport.
                </small>
              ) : (
                <small style={{ color: "#d97706", fontSize: 12, marginTop: 5, display: "block" }}>
                  ⚠️ <strong>Notice:</strong> Please choose carefully. Once you confirm your sport, it will be permanently locked and cannot be changed.
                </small>
              )}
            </div>

            {/* Context-aware Sport Hierarchy Fields */}
            <SportSpecificFields
              sport={athlete.sport}
              gender={athlete.gender}
              sportProfile={sportProfile}
              onChange={(nextSp) => {
                setSportProfile(nextSp);
                setAthlete((prev) => ({
                  ...prev,
                  event: nextSp.event || prev.event,
                  unit: nextSp.measurement?.unit || prev.unit,
                }));
              }}
              target={target}
              onTargetChange={(t) => setTarget(t)}
            />

            {/* Additional Background & Goals */}
            {additionalFields.map((f) => (
              <Input
                key={f.key}
                f={f}
                value={athlete[f.key]}
                onChange={(v) => setAthlete({ ...athlete, [f.key]: v })}
              />
            ))}
          </div>

          <div className="inline-actions" style={{ marginTop: "24px" }}>
            <button type="submit" className="button orange" disabled={busy}>
              {busy ? "Saving…" : "Save athlete details"}
              <Check size={17} />
            </button>
          </div>
        </section>
      </form>

      <form onSubmit={savePrivacyConsent}>
        <section className="panel panel-pad">
          <h2>Privacy & consent</h2>
          <p>
            Choose a registered professional. Sharing is off by default. Medical
            accounts see only health information; coaches receive the categories
            you approve.
          </p>
          <Input
            f={field(
              "coachId",
              "Registered coach / medical email",
              "email",
              null,
              true,
            )}
            value={privacy.coachId}
            onChange={(v) => setPrivacy({ ...privacy, coachId: v })}
          />
          {[
            [
              "sharePerformance",
              "Share performance and achievements with my linked coach",
            ],
            [
              "shareHealth",
              "Share injury records, pain and fatigue with my linked professional",
            ],
            [
              "allowAnalytics",
              "Contribute verified results and profile categories to anonymous cohort and fairness statistics (groups of at least five)",
            ],
          ].map(([key, label]) => (
            <Input
              key={key}
              f={field(key, label, "checkbox")}
              value={privacy[key]}
              onChange={(v) => setPrivacy({ ...privacy, [key]: v })}
            />
          ))}
          <div className="inline-actions" style={{ marginTop: "20px" }}>
            <button type="submit" className="button orange" disabled={busy}>
              {busy ? "Saving…" : "Save profile & consent"}
              <Check size={17} />
            </button>
          </div>
        </section>
      </form>

      <section className="panel panel-pad">
        <h2>Your data belongs to you</h2>
        <p>
          Export your records, or permanently remove this account and its files.
          Offline records are stored on this device; use your own browser
          profile for private health data.
        </p>
        <div className="inline-actions">
          <ExportMenu
            user={user}
            data={data}
            notify={notify}
            pageContext="profile"
            buttonLabel="Export dossier & records"
            className="button ghost"
          />
          <button className="button danger" onClick={deleteAccount}>
            <Trash2 size={17} />
            Delete account
          </button>
        </div>
      </section>

      {/* Sport Double-Confirmation Modal to Prevent Misclick */}
      {confirmStep === 1 && (
        <Modal
          title="Confirm Sport Selection (Step 1 of 2)"
          onClose={handleCancelSportChange}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#92400e", marginBottom: 6 }}>
                <AlertTriangle size={18} />
                <strong style={{ fontSize: 14 }}>Important: Permanent Choice</strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: "#78350f", lineHeight: 1.5 }}>
                You are about to select <strong>{pendingSport}</strong> as your primary sport.
                Under One Nation One Athlete regulations, <strong>athletes cannot change their sport field once selected</strong>.
              </p>
            </div>

            <div style={{ background: "#f8faf5", border: "1px solid #e2ebd6", borderRadius: 8, padding: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#556247", textTransform: "uppercase" }}>Selected Sport:</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1e24", marginTop: 2 }}>
                🏆 {pendingSport}
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Are you sure you want to select <strong>{pendingSport}</strong>? To ensure you didn&apos;t misclick, we will ask you for a final confirmation next.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button
                type="button"
                className="button ghost"
                onClick={handleCancelSportChange}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button orange"
                onClick={handleProceedToStep2}
              >
                Proceed to Final Confirmation (1/2) <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmStep === 2 && (
        <Modal
          title="Final Confirmation: Lock Sport (Step 2 of 2)"
          onClose={handleCancelSportChange}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#991b1b", marginBottom: 6 }}>
                <Lock size={18} />
                <strong style={{ fontSize: 14 }}>Double-Check to Avoid Misclick</strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: "#7f1d1d", lineHeight: 1.5 }}>
                You are about to <strong>permanently lock</strong> your sport as <strong>{pendingSport}</strong>.
                After this confirmation, the sport field will be disabled and you will NOT be able to change it.
              </p>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: "#ffffff",
                border: "1.5px solid #23341b",
                borderRadius: 8,
                padding: "12px 14px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={finalCheckbox}
                onChange={(e) => setFinalCheckbox(e.target.checked)}
                style={{ marginTop: 3, cursor: "pointer", width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: "#1a1e24", lineHeight: 1.4 }}>
                <strong>I confirm that {pendingSport} is my correct sport.</strong> I understand this selection is permanent and cannot be modified later.
              </span>
            </label>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setConfirmStep(1)}
              >
                ← Back to Step 1
              </button>
              <button
                type="button"
                className="button orange"
                disabled={!finalCheckbox}
                style={{
                  background: finalCheckbox ? "#2e7d32" : "#9ca3af",
                  borderColor: finalCheckbox ? "#2e7d32" : "#9ca3af",
                  cursor: finalCheckbox ? "pointer" : "not-allowed",
                }}
                onClick={handleFinalLockConfirm}
              >
                <Lock size={14} /> Confirm & Permanently Lock Sport
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
