export function landmarksToFeatures(landmarks) {
  if (!landmarks || landmarks.length !== 21) return null;
  const flat = new Float32Array(63);
  for (let i = 0; i < 21; i++) {
    const { x = 0, y = 0, z = 0 } = landmarks[i] ?? {};
    // Kaggle already: x,y in [0,1]; z depth with wrist as origin
    flat[i * 3 + 0] = Number.isFinite(x) ? x : 0;
    flat[i * 3 + 1] = Number.isFinite(y) ? y : 0;
    flat[i * 3 + 2] = Number.isFinite(z) ? z : 0;
  }
  return flat;
}