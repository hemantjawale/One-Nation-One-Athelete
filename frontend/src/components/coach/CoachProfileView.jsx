import React, { useState, useEffect } from "react";
import {
  User,
  Award,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Building,
  MapPin,
  Lock,
  Briefcase,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export function CoachProfileView({
  profile,
  loading,
  onSaveProfile,
  notify,
}) {
  const [formData, setFormData] = useState({
    name: "",
    specialization: "Track & Field Sprint Performance",
    sports: "Athletics",
    events: "100m, 200m",
    experienceYears: 6,
    organization: "",
    state: "",
    district: "",
    bio: "",
    contactPhone: "",
    certifications: [],
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        specialization: profile.specialization || "Sprint Performance",
        sports: Array.isArray(profile.sports) ? profile.sports.join(", ") : profile.sports || "Athletics",
        events: Array.isArray(profile.events) ? profile.events.join(", ") : profile.events || "100m, 200m",
        experienceYears: profile.experienceYears || 5,
        organization: profile.organization || "",
        state: profile.state || "",
        district: profile.district || "",
        bio: profile.bio || "",
        contactPhone: profile.contactPhone || "",
        certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
      });
    }
  }, [profile]);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddCert() {
    setFormData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: "Level 1 Athletics Coach Certification",
          issuer: "Athletics Federation of India (AFI)",
          year: new Date().getFullYear().toString(),
          verificationStatus: "Unverified",
        },
      ],
    }));
  }

  function handleUpdateCert(idx, field, value) {
    setFormData((prev) => {
      const copy = [...prev.certifications];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, certifications: copy };
    });
  }

  function handleRemoveCert(idx) {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        sports: formData.sports.split(",").map((s) => s.trim()).filter(Boolean),
        events: formData.events.split(",").map((e) => e.trim()).filter(Boolean),
        experienceYears: Number(formData.experienceYears),
      };
      await onSaveProfile(payload);
      notify?.("Coach profile updated successfully.");
    } catch (err) {
      notify?.("Error saving coach profile: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const initialLetter = (formData.name || profile?.name || "C").charAt(0).toUpperCase();

  return (
    <div className="coach-profile-wrapper">
      {/* Top Hero Banner */}
      <div className="coach-hero-banner">
        <div className="coach-hero-left">
          <div className="coach-avatar-circle">{initialLetter}</div>
          <div className="coach-hero-info">
            <h2>{formData.name || "Coach Profile"}</h2>
            <div className="coach-hero-subtitle">
              {formData.specialization || "Professional Athletics Coach"}
              {formData.organization ? ` · ${formData.organization}` : ""}
            </div>
            <div className="coach-hero-meta">
              <span className="coach-hero-badge">
                <ShieldCheck size={14} /> Verified Coach Workspace
              </span>
              <span className="coach-hero-stat-pill">
                <Briefcase size={12} /> {formData.experienceYears} Yrs Experience
              </span>
              {(formData.district || formData.state) && (
                <span className="coach-hero-stat-pill">
                  <MapPin size={12} /> {[formData.district, formData.state].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Card 1: Account & General Information */}
        <div className="coach-profile-card">
          <div className="coach-card-header">
            <div>
              <div className="coach-card-title">
                <User size={18} /> General Account Information
              </div>
              <p className="coach-card-desc">
                Basic identity and communication details used for linking athletes and notifications.
              </p>
            </div>
          </div>

          <div className="coach-grid-2">
            <div className="field-group">
              <label className="field-label">Full Coach Name</label>
              <input
                type="text"
                className="field-input"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Coach Email <Lock size={11} style={{ color: "#64748b" }} />
              </label>
              <input
                type="email"
                className="field-input"
                value={profile?.email || ""}
                disabled
                title="Linked to your account credentials"
              />
            </div>
          </div>

          <div className="coach-grid-2">
            <div className="field-group">
              <label className="field-label">Contact Phone / WhatsApp</label>
              <input
                type="text"
                className="field-input"
                value={formData.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Specialization & Scope */}
        <div className="coach-profile-card">
          <div className="coach-card-header">
            <div>
              <div className="coach-card-title">
                <Award size={18} /> Coaching Credentials & Scope
              </div>
              <p className="coach-card-desc">
                Define your primary coaching discipline, sports, and specific target events.
              </p>
            </div>
          </div>

          <div className="coach-grid-2">
            <div className="field-group">
              <label className="field-label">Primary Specialization</label>
              <input
                type="text"
                className="field-input"
                value={formData.specialization}
                onChange={(e) => handleChange("specialization", e.target.value)}
                placeholder="e.g. Track & Field Sprint Performance"
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Years of Coaching Experience</label>
              <input
                type="number"
                className="field-input"
                value={formData.experienceYears}
                onChange={(e) => handleChange("experienceYears", e.target.value)}
                min="0"
                max="60"
                required
              />
            </div>
          </div>

          <div className="coach-grid-2">
            <div className="field-group">
              <label className="field-label">Sports (Comma Separated)</label>
              <input
                type="text"
                className="field-input"
                value={formData.sports}
                onChange={(e) => handleChange("sports", e.target.value)}
                placeholder="Athletics, Badminton, Football"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Events Coached (Comma Separated)</label>
              <input
                type="text"
                className="field-input"
                value={formData.events}
                onChange={(e) => handleChange("events", e.target.value)}
                placeholder="100m, 200m, 400m, Relays"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Affiliation & Location */}
        <div className="coach-profile-card">
          <div className="coach-card-header">
            <div>
              <div className="coach-card-title">
                <Building size={18} /> Organization & Location
              </div>
              <p className="coach-card-desc">
                Your primary training academy, sports club, and regional district/state affiliation.
              </p>
            </div>
          </div>

          <div className="coach-grid-3">
            <div className="field-group">
              <label className="field-label">Club / Academy / Organization</label>
              <input
                type="text"
                className="field-input"
                value={formData.organization}
                onChange={(e) => handleChange("organization", e.target.value)}
                placeholder="e.g. District Athletics Academy"
              />
            </div>

            <div className="field-group">
              <label className="field-label">State</label>
              <input
                type="text"
                className="field-input"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>

            <div className="field-group">
              <label className="field-label">District</label>
              <input
                type="text"
                className="field-input"
                value={formData.district}
                onChange={(e) => handleChange("district", e.target.value)}
                placeholder="e.g. Nashik"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Coaching Philosophy */}
        <div className="coach-profile-card">
          <div className="coach-card-header">
            <div>
              <div className="coach-card-title">
                <BookOpen size={18} /> Coaching Philosophy & Biography
              </div>
              <p className="coach-card-desc">
                Share your training methodology, periodization approach, and athlete development values.
              </p>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Methodology & Background</label>
            <textarea
              className="field-textarea"
              rows={4}
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Describe your technical methodology, recovery standards, and athlete mentorship philosophy..."
            />
          </div>
        </div>

        {/* Card 5: Certifications */}
        <div className="coach-profile-card">
          <div className="coach-card-header">
            <div>
              <div className="coach-card-title">
                <Award size={18} /> Certifications & Accreditations
              </div>
              <p className="coach-card-desc">
                Official qualifications from sports federations (e.g. AFI, World Athletics, NIS).
              </p>
            </div>

            <button
              type="button"
              className="button small ghost"
              onClick={handleAddCert}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Add Certification
            </button>
          </div>

          {formData.certifications.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px dashed #cbd5e1",
                color: "#64748b",
                fontSize: 13.5,
              }}
            >
              No certifications listed yet. Click <strong>Add Certification</strong> to include your federated credentials.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {formData.certifications.map((c, cIdx) => (
                <div key={cIdx} className="cert-card-item">
                  <div className="cert-card-header">
                    <span className={`cert-status-tag ${c.verificationStatus === "Verified" ? "verified" : ""}`}>
                      {c.verificationStatus === "Verified" ? (
                        <>
                          <CheckCircle2 size={12} /> Verified Credential
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={12} /> Status: {c.verificationStatus || "Unverified"}
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => handleRemoveCert(cIdx)}
                      title="Remove Certification"
                      style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="coach-grid-3">
                    <div className="field-group">
                      <label className="field-label">Certificate Name</label>
                      <input
                        type="text"
                        className="field-input"
                        value={c.name}
                        onChange={(e) => handleUpdateCert(cIdx, "name", e.target.value)}
                        placeholder="e.g. AFI Level 1 Sprint Coach"
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Issuing Body</label>
                      <input
                        type="text"
                        className="field-input"
                        value={c.issuer}
                        onChange={(e) => handleUpdateCert(cIdx, "issuer", e.target.value)}
                        placeholder="e.g. Athletics Federation of India"
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Year Issued</label>
                      <input
                        type="text"
                        className="field-input"
                        value={c.year}
                        onChange={(e) => handleUpdateCert(cIdx, "year", e.target.value)}
                        placeholder="2024"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Bar */}
        <div className="coach-save-footer">
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Ensure all credentials and regional affiliations are kept up-to-date.
          </div>
          <button
            type="submit"
            className="button orange"
            disabled={saving}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.25)",
            }}
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Coach Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
