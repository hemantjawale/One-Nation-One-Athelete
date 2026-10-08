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
  Phone,
  BookOpen,
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
          name: "Sprint Coach Certification",
          issuer: "Athletics Federation of India",
          year: "2024",
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
    }
  }

  return (
    <div className="coach-profile-view">
      <div className="section-header-row" style={{ marginBottom: 16 }}>
        <div>
          <h2>Coach Professional Dossier & Profile</h2>
          <p className="subtitle-sm">
            Manage your coaching credentials, organizational affiliation, and athlete onboarding information.
          </p>
        </div>
      </div>

      <div className="panel panel-pad" style={{ maxWidth: 840, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} className="coach-form-stack">
          <div className="form-row-2">
            <div>
              <label>Full Coach Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>
            <div>
              <label>Coach Email (Athletes link with this):</label>
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                style={{ background: "#f0f2eb" }}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label>Primary Specialization:</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => handleChange("specialization", e.target.value)}
                placeholder="e.g. Sprint & Horizontal Acceleration"
                required
              />
            </div>
            <div>
              <label>Years of Coaching Experience:</label>
              <input
                type="number"
                value={formData.experienceYears}
                onChange={(e) => handleChange("experienceYears", e.target.value)}
                min="0"
                max="60"
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label>Sports (comma separated):</label>
              <input
                type="text"
                value={formData.sports}
                onChange={(e) => handleChange("sports", e.target.value)}
                placeholder="Athletics, Track & Field"
              />
            </div>
            <div>
              <label>Events Coached (comma separated):</label>
              <input
                type="text"
                value={formData.events}
                onChange={(e) => handleChange("events", e.target.value)}
                placeholder="100m, 200m, 400m"
              />
            </div>
          </div>

          <div className="form-row-3">
            <div>
              <label>Club / Academy / Organization:</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => handleChange("organization", e.target.value)}
                placeholder="District Sports Authority"
              />
            </div>
            <div>
              <label>State:</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label>District:</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleChange("district", e.target.value)}
                placeholder="Nashik"
              />
            </div>
          </div>

          <div>
            <label>Coaching Philosophy & Biography:</label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Describe your coaching methodology, track record, and technical philosophy…"
              rows={4}
            />
          </div>

          {/* Certifications Block (Section 45: Verification status remains Unverified) */}
          <div className="builder-section-block" style={{ marginTop: 20 }}>
            <div className="sec-head-row">
              <div>
                <span className="sec-title">CERTIFICATIONS & ACCREDITATIONS</span>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6a775b" }}>
                  All entered certifications display as &quot;Unverified&quot; until validated by state/national sports bodies.
                </p>
              </div>
              <button
                type="button"
                className="button small ghost"
                onClick={handleAddCert}
              >
                <Plus size={13} /> Add Certification
              </button>
            </div>

            {formData.certifications.length === 0 ? (
              <p className="empty-hint">No certifications entered yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {formData.certifications.map((c, cIdx) => (
                  <div key={cIdx} className="exercise-builder-row">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="pill small amber">
                        Verification Status: {c.verificationStatus || "Unverified"}
                      </span>
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => handleRemoveCert(cIdx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="form-row-3" style={{ marginTop: 8 }}>
                      <div>
                        <label>Certificate Name:</label>
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => handleUpdateCert(cIdx, "name", e.target.value)}
                          placeholder="e.g. AFI Level 1 Coach"
                        />
                      </div>
                      <div>
                        <label>Issuing Body:</label>
                        <input
                          type="text"
                          value={c.issuer}
                          onChange={(e) => handleUpdateCert(cIdx, "issuer", e.target.value)}
                          placeholder="e.g. World Athletics / SAI"
                        />
                      </div>
                      <div>
                        <label>Year Issued:</label>
                        <input
                          type="text"
                          value={c.year}
                          onChange={(e) => handleUpdateCert(cIdx, "year", e.target.value)}
                          placeholder="2023"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button type="submit" className="button orange">
              <Save size={15} /> Save Coach Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
