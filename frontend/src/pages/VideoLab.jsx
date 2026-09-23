import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ScanLine, Upload, FileText, Pencil, Trash2 } from "lucide-react";
import { PageTitle, Modal, Input } from "../components/UI";
import { field } from "../lib/forms";
import { api } from "../lib/api";
import { analyseVideo, compressVideo } from "../lib/video";
export default function VideoLab() {
  const { data, reload, notify, confirmDelete } = useOutletContext(),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [compress, setCompress] = useState(false),
    [edit, setEdit] = useState(null),
    video = useRef();
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
    if (!Number.isFinite(video.current?.duration) || !video.current?.duration) {
      notify(
        "Wait for the video to load. If duration is missing, use an MP4.",
        "error",
      );
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const analysis = await analyseVideo(video.current, setProgress),
        row = await api("/files/" + selected.id, {
          method: "PUT",
          body: { name: selected.name, notes: selected.notes, analysis },
        });
      setSelected(row);
      await reload();
      notify("Pose measurements saved.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        kicker="DISCOVER / YOUR MOVEMENT"
        title="Talent, in motion"
        subtitle="Turn a phone recording into an observable starting point."
        action={
          <label className="button orange upload-button">
            <Upload size={17} />
            {busy ? `Working ${progress}%` : "Upload a file"}
            <input
              type="file"
              disabled={busy}
              accept="video/mp4,video/webm,image/png,image/jpeg,application/pdf"
              onChange={upload}
            />
          </label>
        }
      />
      <div className="notice">
        MediaPipe pose inference runs on your device. The first run downloads a
        model and requires internet. It measures visible joint angles, not
        athletic potential, sprint speed, or calibrated jump height.
      </div>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={compress}
          disabled={busy}
          onChange={(e) => setCompress(e.target.checked)}
        />
        Compress videos before upload · silent 720p · up to two minutes
      </label>
      <div className="lab-grid">
        <section className="panel video-stage">
          {selected ? (
            <>
              <video
                ref={video}
                key={selected.id}
                src={"/api/files/" + selected.id + "/content"}
                controls
                playsInline
                preload="metadata"
              />
              <div className="panel-pad">
                <h3>{selected.name}</h3>
                <button
                  className="button orange"
                  disabled={busy}
                  onClick={analyse}
                >
                  <ScanLine size={17} />
                  {busy ? `Analysing ${progress}%` : "Analyse first 30 seconds"}
                </button>
                {selected.analysis && (
                  <div className="analysis-results">
                    <div>
                      <strong>{selected.analysis.kneeAngle}°</strong>
                      <span>Mean left knee angle</span>
                    </div>
                    <div>
                      <strong>{selected.analysis.samples}</strong>
                      <span>Valid pose samples</span>
                    </div>
                    <p>
                      Angle stability: {selected.analysis.consistency}/100. This
                      measures variation within the clip, not technique quality.
                      Camera angle, occlusion, and adaptive movement affect
                      results.
                    </p>
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
                on your performance.
              </h2>
              <p>
                Upload a side-view MP4 or WebM.
                <br />
                Keep your whole body visible. Max 50 MB.
              </p>
            </div>
          )}
        </section>
        <section className="panel panel-pad">
          <span className="eyebrow">YOUR SECURE LIBRARY</span>
          <h2>Clips & certificates</h2>
          {data.files.length ? (
            data.files.map((f) => (
              <div className="file-row" key={f.id}>
                <FileText size={22} />
                <div>
                  <button
                    className="file-name"
                    onClick={() =>
                      f.mime.startsWith("video/")
                        ? setSelected(f)
                        : window.open(
                            "/api/files/" + f.id + "/content",
                            "_blank",
                          )
                    }
                  >
                    {f.name}
                  </button>
                  <small>
                    {(f.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                    {f.analysis ? "Analysed" : "Uploaded"}
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
            <p>Your uploaded videos and certificates will appear here.</p>
          )}
        </section>
      </div>
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
              value={edit.notes}
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
