import { nowISO } from "../utils/time";

export const initialTranscript = [
  { role: "DHH", text: "Hi, I'd like to apply for a membership please.", timestamp: nowISO() },
  { role: "STAFF", text: "Sure. Can I have your ID.", timestamp: nowISO() },
  { role: "DHH", text: "Can I use my driver's license.", timestamp: nowISO() },
  { role: "STAFF", text: "Sure.", timestamp: nowISO() },
];
