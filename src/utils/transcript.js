import { formatDDMMYY } from "./time";

export function buildTranscriptLines(list) {
  if (!list || list.length === 0) return ["(No messages in this session)"];
  return list.map((m) => `[${formatDDMMYY(m.timestamp)}] ${m.role}: ${m.text}`);
}
