export async function loadScaler(url = "/models/sign10/scaler.json") {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch scaler: ${res.status}`);
    const { mean, scale } = await res.json();
    return { mean: Float32Array.from(mean), scale: Float32Array.from(scale) };
  }
  
  export function applyScaler(feat, scaler) {
    const out = new Float32Array(feat.length);
    for (let i = 0; i < feat.length; i++) {
      const s = scaler.scale[i] || 1e-6;
      out[i] = (feat[i] - scaler.mean[i]) / s;
    }
    return out;
  }
  