import { analyseVideoPipeline } from "./videoService";

export async function analyseVideo(videoElement, onProgress) {
  return analyseVideoPipeline(videoElement, onProgress);
}

export async function compressVideo(file, onProgress) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream)
    throw Error(
      "Compression is unsupported here. Uncheck it to upload the original.",
    );
  const mime = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime)
    throw Error("WebM compression unavailable. Upload the original instead.");
  const { default: fix } = await import("fix-webm-duration"),
    video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  const url = URL.createObjectURL(file);
  video.src = url;
  let stream, recorder, raf, timer;
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(Error("This video cannot be decoded."));
    });
    if (!Number.isFinite(video.duration) || video.duration > 120)
      throw Error(
        "Compression supports clips up to two minutes with valid duration metadata.",
      );
    const canvas = document.createElement("canvas"),
      ratio = Math.min(1, 1280 / video.videoWidth, 720 / video.videoHeight);
    canvas.width = Math.round((video.videoWidth * ratio) / 2) * 2;
    canvas.height = Math.round((video.videoHeight * ratio) / 2) * 2;
    const ctx = canvas.getContext("2d");
    stream = canvas.captureStream(24);
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 1200000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const done = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.onerror = () =>
        reject(Error("Compression failed. Try the original."));
    });
    video.onended = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };
    recorder.start(500);
    await video.play();
    function draw() {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress(
        Math.min(99, Math.round((video.currentTime / video.duration) * 100)),
      );
      if (!video.ended) raf = requestAnimationFrame(draw);
    }
    draw();
    timer = setTimeout(
      () => {
        video.pause();
        if (recorder.state !== "inactive") recorder.stop();
      },
      (video.duration + 20) * 1000,
    );
    const raw = await done;
    if (video.currentTime < video.duration - 0.3)
      throw Error(
        "Compression interrupted. Keep this tab visible and try again.",
      );
    const blob = await fix(raw, video.duration * 1000, { logger: false });
    return blob.size < file.size
      ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webm", {
          type: "video/webm",
        })
      : file;
  } finally {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    video.pause();
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    URL.revokeObjectURL(url);
  }
}
