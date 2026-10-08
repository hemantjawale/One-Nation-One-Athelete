import { useState, useRef, useEffect } from "react";
import {
  Download,
  FileText,
  Fingerprint,
  Activity,
  Trophy,
  History,
  Users,
  Code2,
  ChevronDown,
} from "lucide-react";
import { exportPdfByType } from "../lib/pdf";
import { exportData } from "../lib/api";

export function ExportMenu({
  user,
  data,
  coachData,
  filteredRecords,
  filterLabel,
  notify,
  pageContext = "general",
  buttonLabel = "Export",
  className = "button dark",
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleExport(type) {
    setBusy(true);
    setOpen(false);
    try {
      if (type === "json") {
        await exportData(`${(data?.profile?.name || "athlete").toLowerCase()}-backup.json`);
        notify?.("Raw JSON backup downloaded.");
      } else {
        await exportPdfByType({
          type,
          user,
          data,
          coachData,
          filteredRecords,
          filterLabel,
        });
        notify?.("Professional PDF generated.");
      }
    } catch (err) {
      notify?.(err.message || "Failed to generate export", "error");
    } finally {
      setBusy(false);
    }
  }

  const isCoach = ["coach", "medical"].includes(user?.role);

  return (
    <div className="export-menu-container" ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Download size={16} />
        <span>{busy ? "Generating…" : buttonLabel}</span>
        <ChevronDown size={14} style={{ opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div className="export-dropdown-menu" role="menu">
          <div className="export-menu-header">OFFICIAL PDF EXPORTS</div>

          {/* Contextual & Athlete PDF Options */}
          {(!isCoach || pageContext !== "coach") && (
            <>
              <button
                type="button"
                className="export-menu-item"
                onClick={() => handleExport("passport")}
                role="menuitem"
              >
                <Fingerprint size={16} className="item-icon" />
                <div>
                  <strong>Athlete Passport PDF</strong>
                  <small>Digital sports ID & attestation</small>
                </div>
              </button>

              <button
                type="button"
                className="export-menu-item"
                onClick={() => handleExport("profile")}
                role="menuitem"
              >
                <FileText size={16} className="item-icon" />
                <div>
                  <strong>Full Athlete Profile PDF</strong>
                  <small>Comprehensive dossier & history</small>
                </div>
              </button>

              <button
                type="button"
                className="export-menu-item"
                onClick={() => handleExport("performance")}
                role="menuitem"
              >
                <Activity size={16} className="item-icon" />
                <div>
                  <strong>Performance Report PDF</strong>
                  <small>Progression metrics & benchmarks</small>
                </div>
              </button>

              <button
                type="button"
                className="export-menu-item"
                onClick={() => handleExport("journey")}
                role="menuitem"
              >
                <History size={16} className="item-icon" />
                <div>
                  <strong>
                    {filterLabel ? `Training Journey (${filterLabel}) PDF` : "Training Journey PDF"}
                  </strong>
                  <small>Timeline log & workload history</small>
                </div>
              </button>

              <button
                type="button"
                className="export-menu-item"
                onClick={() => handleExport("achievements")}
                role="menuitem"
              >
                <Trophy size={16} className="item-icon" />
                <div>
                  <strong>Achievement Report PDF</strong>
                  <small>Verified milestones & certificates</small>
                </div>
              </button>
            </>
          )}

          {/* Coach Specific PDF Option */}
          {isCoach && (
            <button
              type="button"
              className="export-menu-item"
              onClick={() => handleExport("coach")}
              role="menuitem"
            >
              <Users size={16} className="item-icon" />
              <div>
                <strong>Coach Profile & Roster PDF</strong>
                <small>Mentored roster & attestations</small>
              </div>
            </button>
          )}

          <div className="export-menu-divider" />

          {/* Advanced / Developer JSON Backup */}
          <button
            type="button"
            className="export-menu-item raw-data"
            onClick={() => handleExport("json")}
            role="menuitem"
          >
            <Code2 size={15} className="item-icon" />
            <div>
              <strong>Raw Data Backup (JSON)</strong>
              <small>System portability & local restore</small>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
