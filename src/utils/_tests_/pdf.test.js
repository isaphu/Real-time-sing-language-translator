import { exportTranscriptPDF } from "../pdf";
import jsPDF from "jspdf";

vi.useFakeTimers().setSystemTime(new Date("2025-01-01T12:00:00Z"));

describe("pdf export", () => {
  test("calls jsPDF.save()", () => {
    const docSaveSpy = jsPDF.prototype.save; // mocked in setupTests
    exportTranscriptPDF([
      { role: "DHH", text: "Hello", timestamp: new Date().toISOString() },
    ]);

    expect(docSaveSpy).toHaveBeenCalledTimes(1);
    const arg = docSaveSpy.mock.calls[0][0];
    expect(arg).toMatch(/chat-transcript-2025-01-01-12-00-00\.pdf/);
  });
});
