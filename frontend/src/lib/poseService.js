/**
 * Pose Service - Singleton / Managed MediaPipe PoseLandmarker Lifecycle
 */
let landmarkerInstance = null;
let landmarkerPromise = null;

export async function getPoseLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    try {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
      );
      landmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      return landmarkerInstance;
    } catch (err) {
      landmarkerPromise = null;
      landmarkerInstance = null;
      throw new Error(`Failed to initialize MediaPipe Pose Landmarker: ${err.message}`);
    }
  })();

  return landmarkerPromise;
}

export function releasePoseLandmarker() {
  if (landmarkerInstance) {
    try {
      landmarkerInstance.close();
    } catch (e) {
      console.warn("Error closing PoseLandmarker instance:", e);
    }
    landmarkerInstance = null;
    landmarkerPromise = null;
  }
}
