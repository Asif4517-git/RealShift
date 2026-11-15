/** Approximate road load. Frontal area is 85% of width × height; Cd 0.32 is
 * a generic passenger-car estimate, not a measured drag coefficient. */
export function roadLoadN(massKg: number, widthMm: number, heightMm: number, speedMs: number): number {
  const frontalArea = (widthMm / 1000) * (heightMm / 1000) * 0.85;
  return massKg * 9.81 * 0.014 + 0.5 * 1.2 * 0.32 * frontalArea * speedMs * speedMs;
}
