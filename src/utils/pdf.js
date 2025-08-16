import jsPDF from "jspdf";
import { formatDDMMYY } from "./time";
import { buildTranscriptLines } from "./transcript";

export function exportTranscriptPDF(transcript) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(12);

  const left = 40;
  const topStart = 50;
  const lineHeight = 18;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - left * 2;

  const header = `Chat Transcript — generated ${formatDDMMYY(new Date())}`;
  let y = topStart;
  const headerLines = doc.splitTextToSize(header, maxWidth);
  headerLines.forEach((ln) => { doc.text(ln, left, y); y += lineHeight; });
  y += lineHeight * 0.5;

  const content = buildTranscriptLines(transcript);
  content.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    wrapped.forEach((ln) => {
      if (y + lineHeight > pageHeight - 40) {
        doc.addPage();
        y = topStart;
      }
      doc.text(ln, left, y);
      y += lineHeight;
    });
  });

  const fname = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
  doc.save(`chat-transcript-${fname}.pdf`);
}
