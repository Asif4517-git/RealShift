import type { Units } from "./store";

export const speedValue = (kph: number, units: Units) => (units === "metric" ? kph : kph * 0.621371);
export const speedUnit = (units: Units) => (units === "metric" ? "km/h" : "mph");
export const torqueValue = (nm: number, units: Units) => (units === "metric" ? nm : nm * 0.737562);
export const torqueUnit = (units: Units) => (units === "metric" ? "Nm" : "lb-ft");
export const tempValue = (c: number, units: Units) => (units === "metric" ? c : c * 1.8 + 32);
export const tempUnit = (units: Units) => (units === "metric" ? "°C" : "°F");
export const distanceValue = (km: number, units: Units) => (units === "metric" ? km : km * 0.621371);
export const distanceUnit = (units: Units) => (units === "metric" ? "km" : "mi");
export const powerKw = (hp: number) => hp * 0.7457;

export const nf = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);

export const timeAgo = (iso: string) => {
  const date = new Date(iso).getTime();
  const diff = Date.now() - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
