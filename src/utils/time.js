export function pad2(n) {
    return String(n).padStart(2, "0");
  }
  
  export function formatTimestamp(ts) {
    try {
      const d = ts ? new Date(ts) : new Date();
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    } catch {
      return new Date().toISOString();
    }
  }
  
  // Export timestamp (PDF): DD/MM/YY, HH:MM:SS AM/PM
  export function formatDDMMYY(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yy = pad2(d.getFullYear() % 100);
    let hour = d.getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hh = pad2(hour);
    const min = pad2(d.getMinutes());
    const sec = pad2(d.getSeconds());
    return `${dd}/${mm}/${yy}, ${hh}:${min}:${sec} ${ampm}`;
  }
  
  export function nowISO() {
    return new Date().toISOString();
  }
  