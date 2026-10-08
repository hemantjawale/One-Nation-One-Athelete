/**
 * Video Service - Frame extraction and processing pipeline.
 */
import { getPoseLandmarker } from "./poseService";
import { processFrameLandmarks } from "./landmarkProcessor";
import { computeMovementMetrics } from "./movementMetrics";

export async function analyseVideoPipeline(videoElement, onProgress, options = {}) {
  if (!videoElement || !Number.isFinite(videoElement.duration) || videoElement.duration <= 0) {
    throw new Error("Invalid video element or duration metadata missing.");
  }

  const duration = Math.min(videoElement.duration, options.maxDuration || 30);
  const step = options.frameStep || 0.15; // 150ms frame sampling
  const landmarker = await getPoseLandmarker();

  const frameList = [];
  let totalProcessed = 0;

  videoElement.pause();

  try {
    for (let time = 0.05; time < duration; time += step) {
      // Seek video to timestamp
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Video seek timed out. Use a valid MP4 or WebM video.")),
          4000
        );
        videoElement.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        videoElement.currentTime = time;
      });

      totalProcessed++;
      const timestampMs = time * 1000;
      const result = landmarker.detectForVideo(videoElement, timestampMs);

      const frameResult = processFrameLandmarks(
        result.landmarks,
        result.worldLandmarks,
        options.minVisibility || 0.55
      );
      frameResult.timestamp = +time.toFixed(2);
      frameList.push(frameResult);

      if (onProgress) {
        onProgress(Math.min(99, Math.round((time / duration) * 100)));
      }

      // Yield event loop to keep UI responsive
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    videoElement.onseeked = null;
    videoElement.currentTime = 0;
  }

  const analysis = computeMovementMetrics(frameList, totalProcessed, duration);
  if (analysis.validFrameCount < 3) {
    throw new Error(
      "Not enough visible poses detected. Ensure the athlete's full body is visible with adequate lighting and a side-view angle."
    );
  }

  return analysis;
}
