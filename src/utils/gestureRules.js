function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
function makePerPhraseCooldown(defaultMs) {
  const lastByPhrase = new Map();
  return function canEmit(phrase, t, ms = defaultMs) {
    const last = lastByPhrase.get(phrase) ?? -Infinity;
    if (t - last >= ms) { lastByPhrase.set(phrase, t); return true; }
    return false;
  };
}
function makeStability(stableMs) {
  let lastLabel = null, lastTime = 0, acc = 0;
  return {
    seen(label, t) {
      if (label == null) { lastLabel = null; acc = 0; return false; }
      if (lastLabel === label) acc += (t - lastTime);
      else { lastLabel = label; acc = 0; }
      lastTime = t;
      return acc >= stableMs;
    },
    reset() { lastLabel = null; lastTime = 0; acc = 0; },
  };
}

/**
 * MediaPipe + custom-model interpreter
 */
export function createGestureInterpreter(opts = {}) {
  const {
    cooldownMs = 2800,
    builtInMinScore = 0.50,      // loosened
    customMinScore = 0.35,
    customMap = {},
    stableMs = 700,               // snappier than before
    wave = { windowMs: 1000, minAmplitude: 0.02, minSwitches: 1 }, // easier wave
    palmHoldMs = 250,            // fallback: hold open palm to toggle Hi/Bye
  } = opts;

  const canEmit = makePerPhraseCooldown(cooldownMs);
  const customStable = makeStability(stableMs);
  const mpStable = makeStability(stableMs);

  // allow first gesture to emit with no warm-up
  let seenAny = false;

  // wave state (Open_Palm)
  let lastX = null, switches = 0, lastDir = 0, waveStart = 0;
  let lastWaveEmit = -Infinity;       // when we last emitted Hi/Bye
  let openPalmHoldStart = 0;          // fallback (hold steady)

  function resetWave(t) {
    lastX = null; switches = 0; lastDir = 0; waveStart = t || 0;
  }

  function handleWave(landmarks, t) {
    if (!landmarks || landmarks.length === 0) return null;
    const x = landmarks[0].x; // wrist x
    if (lastX == null) { lastX = x; waveStart = t; return null; }

    const dx = x - lastX;
    const dir = dx > 0 ? 1 : dx < 0 ? -1 : 0;

    if (Math.abs(dx) >= wave.minAmplitude && dir !== 0 && dir !== lastDir) {
      switches += 1;
      lastDir = dir;
    }
    lastX = x;

    if (t - waveStart > wave.windowMs) {
      const ok = switches >= wave.minSwitches;
      resetWave(t);
      if (ok) {
        handleWave._toggle = !handleWave._toggle;
        lastWaveEmit = t;
        return handleWave._toggle ? "Hi" : "Bye";
      }
    }
    return null;
  }
  handleWave._toggle = false;

  return {
    step({ label, score = 1, landmarks, now = nowMs(), source }) {
      // --- Custom model ---
      if (source === "custom" && label && score >= customMinScore) {
        const stable = seenAny ? customStable.seen(label, now) : true;
        if (!stable) return null;
        const phrase = customMap[label] || label;
        if (phrase && canEmit(phrase, now)) { seenAny = true; return phrase; }
        return null;
      }

      // --- MediaPipe ---
      if (source === "mp") {
        if (!label) return null;

        const stable = seenAny ? mpStable.seen(label, now) : true;
        const sOK = score >= builtInMinScore;

        // Keep tracking wave/fallback timing even if not stable yet
        if (label === "Open_Palm" && sOK) {
          handleWave(landmarks, now);
          if (!openPalmHoldStart) openPalmHoldStart = now;
        } else {
          openPalmHoldStart = 0; // reset if not open palm
        }

        if (!stable) return null;

        // ILY
        if (label === "ILoveYou" && sOK) {
          const p = "I love you";
          if (canEmit(p, now)) { seenAny = true; return p; }
          return null;
        }

        // Thumb_Up -> Thank you
        if (label === "Thumb_Up" && sOK) {
          const p = "Thank you";
          if (canEmit(p, now)) { seenAny = true; return p; }
          return null;
        }

        // Thumb_Down -> No
        if (label === "Thumb_Down" && sOK) {
          const p = "No";
          if (canEmit(p, now)) { seenAny = true; return p; }
          return null;
        }

        // Victory (peace sign) -> Peace
        if (label === "Victory" && sOK) {
          const p = "Peace";
          if (canEmit(p, now)) { seenAny = true; return p; }
          return null;
        }

        // Closed_Fist -> Yes
        if (label === "Closed_Fist" && sOK) {
          const p = "Yes";
          if (canEmit(p, now)) { seenAny = true; return p; }
          return null;
        }

        // Pointing_Up -> You
        if (label === "Pointing_Up" && sOK) {
          const p = "You";
          if (canEmit(p, now)) { seenAny = true; return p; }
          return null;
        }

        // Open_Palm → wave (primary) or hold (fallback) → Hi/Bye
        if (label === "Open_Palm" && sOK) {
          // Primary: left-right wave
          const p = handleWave(landmarks, now);
          if (p && canEmit(p, now)) { seenAny = true; return p; }

          // Fallback: steady hold without a recent wave emission
          const noRecentWave = now - lastWaveEmit > wave.windowMs + 200;
          if (openPalmHoldStart && (now - openPalmHoldStart >= palmHoldMs) && noRecentWave) {
            handleWave._toggle = !handleWave._toggle;
            const phrase = handleWave._toggle ? "Hi" : "Bye";
            if (canEmit(phrase, now)) {
              lastWaveEmit = now;
              seenAny = true;
              openPalmHoldStart = 0; // prevent repeated fallback
              return phrase;
            }
          }
          return null;
        }
      }

      return null;
    },

    reset() {
      customStable.reset();
      mpStable.reset();
      resetWave(0);
      handleWave._toggle = false;
      seenAny = false;
      lastWaveEmit = -Infinity;
      openPalmHoldStart = 0;
    },
  };
}
