/** Engine families for which a matching combustion layout has an available recording.
 * The samples are generic examples of a family, not vehicle-specific recordings. */
export type RecordedFamily = 'diesel-i4' | 'petrol-i3' | 'petrol-i4' | 'petrol-i6' | 'petrol-v6' | 'petrol-v8' | 'petrol-flat6';
export function recordedFamily(layout: string, cylinders: number, diesel: boolean): RecordedFamily | null {
  const inline = layout.toLowerCase().includes('inline');
  const flat = layout.toLowerCase().includes('flat');
  const vee = /\bv(?:-|\d)/i.test(layout);
  if (diesel) return inline && cylinders === 4 ? 'diesel-i4' : null;
  if (inline && cylinders === 3) return 'petrol-i3';
  if (inline && cylinders === 4) return 'petrol-i4';
  if (inline && cylinders === 6) return 'petrol-i6';
  if (flat && cylinders === 6) return 'petrol-flat6';
  if (vee && cylinders === 6) return 'petrol-v6';
  if (vee && cylinders === 8) return 'petrol-v8';
  return null;
}
