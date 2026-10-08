/**
 * Movement Metrics - Aggregates frame angle samples into sprint-specific kinematics.
 */

function calculateStats(samples) {
  if (!samples || samples.length === 0) return null;
  const count = samples.length;
  const sum = samples.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  // Variability rating based on standard deviation
  let variability = "Low";
  if (stdDev > 18) variability = "High";
  else if (stdDev > 10) variability = "Moderate";

  return {
    count,
    mean: +mean.toFixed(1),
    min: +min.toFixed(1),
    max: +max.toFixed(1),
    range: +(max - min).toFixed(1),
    stdDev: +stdDev.toFixed(1),
    variability,
  };
}

export function computeMovementMetrics(frameList, totalFramesProcessed, durationSeconds) {
  const validFrames = frameList.filter((f) => f.isValid);
  const validFrameCount = validFrames.length;
  const invalidFrameCount = totalFramesProcessed - validFrameCount;
  const measurementCoveragePct = Math.round((validFrameCount / Math.max(1, totalFramesProcessed)) * 100);

  // Collect samples for each joint key
  const jointSamples = {
    leftKnee: [],
    rightKnee: [],
    leftHip: [],
    rightHip: [],
    leftAnkle: [],
    rightAnkle: [],
    trunkAngle: [],
    leftShoulder: [],
    leftElbow: [],
  };

  validFrames.forEach((frame) => {
    Object.keys(jointSamples).forEach((key) => {
      if (frame.angles && Number.isFinite(frame.angles[key])) {
        jointSamples[key].push(frame.angles[key]);
      }
    });
  });

  // Calculate stats per joint
  const jointMetrics = {};
  Object.keys(jointSamples).forEach((key) => {
    const stats = calculateStats(jointSamples[key]);
    if (stats) {
      jointMetrics[key] = stats;
    }
  });

  // Symmetry analysis (Left vs Right)
  const symmetry = {};
  if (jointMetrics.leftKnee && jointMetrics.rightKnee) {
    const diff = Math.abs(jointMetrics.leftKnee.mean - jointMetrics.rightKnee.mean);
    symmetry.kneeMeanDiff = +diff.toFixed(1);
    symmetry.kneeRangeDiff = +Math.abs(jointMetrics.leftKnee.range - jointMetrics.rightKnee.range).toFixed(1);
  }
  if (jointMetrics.leftHip && jointMetrics.rightHip) {
    const diff = Math.abs(jointMetrics.leftHip.mean - jointMetrics.rightHip.mean);
    symmetry.hipMeanDiff = +diff.toFixed(1);
  }
  if (jointMetrics.leftAnkle && jointMetrics.rightAnkle) {
    const diff = Math.abs(jointMetrics.leftAnkle.mean - jointMetrics.rightAnkle.mean);
    symmetry.ankleMeanDiff = +diff.toFixed(1);
  }

  // Posture & Trunk Orientation
  const trunkStats = jointMetrics.trunkAngle;
  const trunkVariability = trunkStats ? trunkStats.variability : "Unknown";

  // Overall Posture Consistency Score (0 - 100)
  const primaryDev = jointMetrics.leftKnee?.stdDev || jointMetrics.rightKnee?.stdDev || 15;
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (primaryDev / 90) * 100)));

  // Measurement Confidence
  let confidence = "Moderate";
  if (measurementCoveragePct >= 85 && validFrameCount >= 20) {
    confidence = "High";
  } else if (measurementCoveragePct < 50 || validFrameCount < 5) {
    confidence = "Low";
  }

  // Quality warnings
  const warnings = [];
  if (measurementCoveragePct < 70) {
    warnings.push("Pose coverage is under 70%. Ensure full body is in frame with good lighting.");
  }
  if (invalidFrameCount > validFrameCount) {
    warnings.push("High number of discarded frames due to occlusion or motion blur.");
  }
  if (symmetry.kneeMeanDiff > 12) {
    warnings.push("Notable asymmetry detected between left and right knee extension angles.");
  }

  return {
    validFrameCount,
    invalidFrameCount,
    totalFramesProcessed,
    measurementCoverage: measurementCoveragePct,
    confidence,
    duration: +durationSeconds.toFixed(1),
    consistencyScore,
    joints: jointMetrics,
    symmetry,
    trunkVariability,
    warnings,
    // Primary backward-compatible summary fields
    samples: validFrameCount,
    kneeAngle: jointMetrics.leftKnee?.mean || jointMetrics.rightKnee?.mean || 0,
    consistency: consistencyScore,
    source: "MediaPipe Pose · Client Multi-Joint Analyzer",
    cautions: [
      "These values are 2D movement measurements, not direct indicators of athletic capability.",
      "Interpretation should be reviewed by a qualified track & field coach.",
      "Camera angle, parallax, and frame rate affect measurement accuracy.",
    ],
  };
}
