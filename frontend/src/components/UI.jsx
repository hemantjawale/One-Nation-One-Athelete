import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { X, Check, ArrowUpRight, Target, Pencil, Trash2 } from "lucide-react";
import { forms, field, today } from "../lib/forms";
import { uploadCertificateFile, deleteCertificateFile, getAuthenticatedUrl } from "../lib/api";
export function Brand({ light = false, onClick }) {
  return (
    <button
      className={"brand " + (light ? "light" : "")}
      onClick={onClick}
      aria-label="One Nation One Athlete home"
    >
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      <span>
        ONE NATION
        <span>
          ONE ATHLETE<sup>®</sup>
        </span>
      </span>
    </button>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    ref.current.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={onClose}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Input({ f, value, onChange }) {
  return (
    <label
      className={
        "field " +
        (f.type === "textarea"
          ? "wide"
          : f.type === "checkbox"
            ? "checkbox wide"
            : "")
      }
    >
      {f.type === "checkbox" ? (
        <>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{f.label}</span>
        </>
      ) : (
        <>
          <span>{f.label}</span>
          {f.type === "select" ? (
            <select
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            >
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              rows={3}
              required={!f.optional}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              type={f.type}
              required={!f.optional}
              min={
                f.type === "number"
                  ? ["effort", "amount"].includes(f.key)
                    ? 1
                    : 0
                  : undefined
              }
              max={
                ["pain", "fatigue", "effort"].includes(f.key)
                  ? 10
                  : f.key === "duration"
                    ? 600
                    : f.key === "birthDate"
                      ? today()
                      : undefined
              }
              maxLength={f.type === "text" ? 300 : undefined}
              step={f.type === "number" ? "any" : undefined}
              value={value ?? ""}
              onChange={(e) =>
                onChange(
                  f.type === "number"
                    ? e.target.value === ""
                      ? ""
                      : Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          )}
        </>
      )}
    </label>
  );
}
export function Editor({ kind, row, profile, files, onClose, onSave }) {
  const config = forms[kind],
    [values, setValues] = useState(
      row || {
        ...config.defaults,
        date: today(),
        ...(kind === "sessions"
          ? {
              event: profile.sportProfile?.event || profile.event,
              unit: profile.sportProfile?.measurement?.unit || profile.unit,
            }
          : {}),
      },
    ),
    [busy, setBusy] = useState(false),
    [uploadingCert, setUploadingCert] = useState(false),
    [certError, setCertError] = useState(""),
    [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const update = (key, v) => setValues({ ...values, [key]: v });

  async function handleCertificateSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCertError("Certificate file size exceeds 10MB limit.");
      return;
    }

    setUploadingCert(true);
    setCertError("");
    try {
      const uploaded = await uploadCertificateFile(file);
      update("certificate", uploaded);
      update("verificationStatus", "Self Uploaded");
    } catch (err) {
      setCertError(err.message || "Failed to upload certificate.");
    } finally {
      setUploadingCert(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveCertificate() {
    if (values.certificate?.publicId) {
      deleteCertificateFile(values.certificate.publicId).catch(() => {});
    }
    update("certificate", null);
  }

  return (
    <Modal
      title={(row ? "Edit " : "Add ") + config.title.toLowerCase()}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(values);
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {config.fields.map((f) => (
            <Input
              key={f.key}
              f={f}
              value={values[f.key]}
              onChange={(v) => update(f.key, v)}
            />
          ))}
          {kind === "achievements" && (
            <div className="field wide certificate-field-container">
              <span className="field-label">Certificate / Proof (Cloudinary)</span>

              {values.certificate?.url ? (
                <div className="certificate-upload-card">
                  <div className="cert-thumb-preview">
                    {values.certificate.resourceType === "image" ||
                    values.certificate.url.match(/\.(jpg|jpeg|png|webp)/i) ? (
                      <img
                        src={values.certificate.url}
                        alt="Certificate"
                        className="cert-img"
                      />
                    ) : (
                      <div className="cert-pdf-badge">PDF</div>
                    )}
                  </div>

                  <div className="cert-meta">
                    <strong>
                      {values.certificate.originalName || "Uploaded Certificate"}
                    </strong>
                    <small>
                      Status:{" "}
                      <span className="pill small">
                        {values.verificationStatus || "Self Uploaded"}
                      </span>
                    </small>
                    <div className="cert-buttons">
                      <a
                        href={getAuthenticatedUrl(values.certificate.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="button ghost small"
                      >
                        <ArrowUpRight size={13} /> View ↗
                      </a>
                      <button
                        type="button"
                        className="button ghost small"
                        disabled={uploadingCert}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="button danger small"
                        disabled={uploadingCert}
                        onClick={handleRemoveCertificate}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cert-upload-prompt">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleCertificateSelect}
                  />
                  <button
                    type="button"
                    className="button ghost wide"
                    disabled={uploadingCert}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingCert
                      ? "Uploading to Cloudinary…"
                      : "Upload Certificate / Proof (JPG, PNG, PDF)"}
                  </button>
                  <small className="field-hint">
                    Accepted formats: JPG, JPEG, PNG, WEBP, PDF · Max 10MB
                  </small>
                </div>
              )}

              {certError && (
                <div className="error" style={{ marginTop: 8 }}>
                  {certError}
                </div>
              )}

              {/* Legacy fallback attachment selector */}
              {files.filter((f) => !f.mime.startsWith("video/")).length > 0 && !values.certificate && (
                <label style={{ marginTop: 12, display: "block" }}>
                  <small style={{ color: "#81946a" }}>Or select from locally stored documents:</small>
                  <select
                    value={values.attachmentId || ""}
                    onChange={(e) =>
                      update("attachmentId", e.target.value || undefined)
                    }
                  >
                    <option value="">No local file selected</option>
                    {files
                      .filter((f) => !f.mime.startsWith("video/"))
                      .map((f) => (
                        <option value={f.id} key={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {kind === "plans" &&
            values.days.map((d, i) => (
              <fieldset key={d.day} className="wide">
                <legend>{d.day}</legend>
                {[
                  field("title", "Activity"),
                  field("duration", "Minutes", "number"),
                  field("detail", "Instructions", "textarea"),
                ].map((f) => (
                  <Input
                    key={f.key}
                    f={f}
                    value={d[f.key]}
                    onChange={(v) =>
                      update(
                        "days",
                        values.days.map((x, j) =>
                          j === i ? { ...x, [f.key]: v } : x,
                        ),
                      )
                    }
                  />
                ))}
              </fieldset>
            ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button orange" disabled={busy}>
            {busy ? "Saving…" : "Save record"}
            <Check size={17} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function PageTitle({ kicker, title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "Your story starts here",
  text = "Add your first record to begin tracking progress.",
}) {
  return (
    <div className="empty">
      <Target size={35} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Stat({ label, value, suffix, detail, icon: Icon }) {
  return (
    <div className="stat">
      <div>
        <span className="eyebrow">{label}</span>
        <Icon size={18} />
      </div>
      <strong>
        {value}
        <small>{suffix}</small>
      </strong>
      <p>{detail}</p>
    </div>
  );
}
export function Actions({ edit, remove }) {
  return (
    <div className="record-actions">
      <button className="icon-button" aria-label="Edit record" onClick={edit}>
        <Pencil size={15} />
      </button>
      <button
        className="icon-button"
        aria-label="Delete record"
        onClick={remove}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
export function PageLink({ children, onClick }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={17} />
    </button>
  );
}
const LazyChart = lazy(() => import("./PerformanceChart"));
export function Chart(props) {
  return (
    <Suspense fallback={<div className="chart">Loading chart…</div>}>
      <LazyChart {...props} />
    </Suspense>
  );
}
