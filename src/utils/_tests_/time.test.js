import { formatTimestamp, nowISO } from "../time";

describe("time helpers", () => {
  test("formatTimestamp returns a non-empty string", () => {
    const s = formatTimestamp(nowISO());
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });
});
