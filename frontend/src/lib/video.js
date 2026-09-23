export async function analyseVideo(video, onProgress) {
  const { FilesetResolver, PoseLandmarker } =
    await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
    ),
    model = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  const angles = [],
    duration = Math.min(video.duration, 30);
  const angle = (a, b, c) => {
    const u = [a.x - b.x, a.y - b.y, a.z - b.z],
      v = [c.x - b.x, c.y - b.y, c.z - b.z];
    return (
      (Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            u.reduce((n, x, i) => n + x * v[i], 0) /
              (Math.hypot(...u) * Math.hypot(...v)),
          ),
        ),
      ) *
        180) /
      Math.PI
    );
  };
  video.pause();
  try {
    for (let time = 0.05; time < duration; time += 0.25) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Video seek timed out. Try a shorter MP4.")),
          5000,
        );
        video.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        video.currentTime = time;
      });
      const result = model.detectForVideo(video, time * 1000),
        p = result.worldLandmarks?.[0],
        visible = result.landmarks?.[0];
      if (p && [23, 25, 27].every((i) => (visible[i].visibility || 0) > 0.6)) {
        const a = angle(p[23], p[25], p[27]);
        if (Number.isFinite(a)) angles.push(a);
      }
      onProgress(Math.round((time / duration) * 100));
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    model.close();
    video.onseeked = null;
    video.currentTime = 0;
  }
  if (angles.length < 3)
    throw Error(
      "Not enough visible poses. Use a well-lit side-view video with your whole body visible.",
    );
  const mean = angles.reduce((a, b) => a + b, 0) / angles.length,
    deviation = Math.sqrt(
      angles.reduce((n, a) => n + (a - mean) ** 2, 0) / angles.length,
    );
  return {
    samples: angles.length,
    kneeAngle: +mean.toFixed(1),
    consistency: Math.max(0, Math.round(100 - (deviation / 90) * 100)),
    duration: +duration.toFixed(1),
    source: "MediaPipe Pose · client measured",
  };
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
