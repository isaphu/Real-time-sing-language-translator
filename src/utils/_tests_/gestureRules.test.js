import { createGestureInterpreter } from "../gestureRules";

const now = () => performance.now();

function makeLandmarks(x, y) {
  // 21 normalized points (we really only use index 0 / wrist)
  return Array.from({ length: 21 }, (_, i) => ({ x, y }));
}

describe("gestureRules", () => {
  test("emits I love you when label=ILoveYou", () => {
    const g = createGestureInterpreter({ ilyMinScore: 0.4, cooldownMs: 0 });
    const phrase = g.step({
      label: "ILoveYou",
      score: 0.9,
      landmarks: makeLandmarks(0.5, 0.5),
      now: now(),
    });
    expect(phrase).toBe("I love you");
  });

  test("maps Thumb_Up to Thank you", () => {
    const g = createGestureInterpreter({ builtInMinScore: 0.4, cooldownMs: 0 });
    const phrase = g.step({
      label: "Thumb_Up",
      score: 0.8,
      landmarks: makeLandmarks(0.5, 0.5),
      now: now(),
    });
    expect(phrase).toBe("Thank you");
  });

  test("wave left-right on Open_Palm → Hi / then Bye", () => {
    const g = createGestureInterpreter({
      waveWindowMs: 1000,
      waveMinAmplitude: 0.04,
      waveMinSwitches: 2,
      cooldownMs: 0,
    });

    // simulate oscillating x over a few steps
    const xs = [0.3, 0.7, 0.32, 0.68, 0.35, 0.65];
    let emitted = null;
    for (let i = 0; i < xs.length; i++) {
      emitted = g.step({
        label: "Open_Palm",
        score: 0.9,
        landmarks: makeLandmarks(xs[i], 0.5),
        now: now(),
      }) || emitted;
    }
    expect(emitted).toBe("Hi");

    // another wave > Bye
    emitted = null;
    for (let i = 0; i < xs.length; i++) {
      emitted = g.step({
        label: "Open_Palm",
        score: 0.9,
        landmarks: makeLandmarks(xs[i], 0.5),
        now: now() + 2000,
      }) || emitted;
    }
    expect(emitted).toBe("Bye");
  });

  test("cooldown prevents rapid repeats", () => {
    const g = createGestureInterpreter({ cooldownMs: 2000, ilyMinScore: 0.4 });
    const t1 = g.step({ label: "ILoveYou", score: 0.9, landmarks: makeLandmarks(0.5,0.5), now: 1000 });
    const t2 = g.step({ label: "ILoveYou", score: 0.9, landmarks: makeLandmarks(0.5,0.5), now: 1500 });
    const t3 = g.step({ label: "ILoveYou", score: 0.9, landmarks: makeLandmarks(0.5,0.5), now: 3500 });
    expect(t1).toBe("I love you");
    expect(t2).toBeNull();      // suppressed by cooldown
    expect(t3).toBe("I love you");
  });
});
