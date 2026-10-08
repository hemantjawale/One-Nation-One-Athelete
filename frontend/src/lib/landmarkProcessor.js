/**
 * Landmark Processor - Validates frame quality and computes 2D/3D joint angles safely.
 */

// Helper to calculate 3D angle between points A, B (vertex), C
export function computeAngle(a, b, c) {
  if (!a || !b || !c) return null;
  const u = [a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)];
  const v = [c.x - b.x, c.y - b.y, (c.z || 0) - (b.z || 0)];
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const magU = Math.hypot(u[0], u[1], u[2]);
  const magV = Math.hypot(v[0], v[1], v[2]);
  if (magU === 0 || magV === 0) return null;
  const cosTheta = Math.max(-1, Math.min(1, dot / (magU * magV)));
  const angleDeg = (Math.acos(cosTheta) * 180) / Math.PI;
  return Number.isFinite(angleDeg) ? angleDeg : null;
}

// Helper to compute angle relative to vertical axis (for trunk orientation)
export function computeTrunkAngle(shoulder, hip) {
  if (!shoulder || !hip) return null;
  const dy = hip.y - shoulder.y;
  const dx = hip.x - shoulder.x;
  // Angle in degrees from vertical line (0° is perfectly vertical)
  const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy));
  const angleDeg = (angleRad * 180) / Math.PI;
  return Number.isFinite(angleDeg) ? angleDeg : null;
}

export function processFrameLandmarks(resultLandmarks, resultWorldLandmarks, minVisibility = 0.55) {
  if (!resultLandmarks || !resultLandmarks[0] || !resultWorldLandmarks || !resultWorldLandmarks[0]) {
    return { isValid: false, reason: "No pose detected" };
  }

  const visible = resultLandmarks[0];
  const world = resultWorldLandmarks[0];

  const checkVisibility = (indices) =>
    indices.every((i) => visible[i] && (visible[i].visibility ?? 1.0) >= minVisibility);

  const frameData = {
    isValid: true,
    timestamp: null,
    angles: {},
  };

  // 1. Left Knee (Hip 23, Knee 25, Ankle 27)
  if (checkVisibility([23, 25, 27])) {
    frameData.angles.leftKnee = computeAngle(world[23], world[25], world[27]);
  }

  // 2. Right Knee (Hip 24, Knee 26, Ankle 28)
  if (checkVisibility([24, 26, 28])) {
    frameData.angles.rightKnee = computeAngle(world[24], world[26], world[28]);
  }

  // 3. Left Hip (Shoulder 11, Hip 23, Knee 25)
  if (checkVisibility([11, 23, 25])) {
    frameData.angles.leftHip = computeAngle(world[11], world[23], world[25]);
  }

  // 4. Right Hip (Shoulder 12, Hip 24, Knee 26)
  if (checkVisibility([12, 24, 26])) {
    frameData.angles.rightHip = computeAngle(world[12], world[24], world[26]);
  }

  // 5. Left Ankle (Knee 25, Ankle 27, FootIndex 31)
  if (checkVisibility([25, 27, 31])) {
    frameData.angles.leftAnkle = computeAngle(world[25], world[27], world[31]);
  }

  // 6. Right Ankle (Knee 26, Ankle 28, FootIndex 32)
  if (checkVisibility([26, 28, 32])) {
    frameData.angles.rightAnkle = computeAngle(world[26], world[28], world[32]);
  }

  // 7. Trunk Angle (Shoulder 11/12 & Hip 23/24)
  if (checkVisibility([11, 23])) {
    frameData.angles.trunkAngle = computeTrunkAngle(visible[11], visible[23]);
  } else if (checkVisibility([12, 24])) {
    frameData.angles.trunkAngle = computeTrunkAngle(visible[12], visible[24]);
  }

  // 8. Left Shoulder / Arm Drive (Hip 23, Shoulder 11, Elbow 13)
  if (checkVisibility([23, 11, 13])) {
    frameData.angles.leftShoulder = computeAngle(world[23], world[11], world[13]);
  }

  // 9. Left Elbow (Shoulder 11, Elbow 13, Wrist 15)
  if (checkVisibility([11, 13, 15])) {
    frameData.angles.leftElbow = computeAngle(world[11], world[13], world[15]);
  }

  // Check if at least one core joint angle was successfully extracted
  const validAnglesCount = Object.values(frameData.angles).filter((v) => v !== null).length;
  if (validAnglesCount === 0) {
    return { isValid: false, reason: "Low landmark visibility" };
  }

  return frameData;
}
