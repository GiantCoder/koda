/** Human-readable label for a shot/delivery enum string. */
export function shotTypeToLabel(shotType: string): string {
  return String(shotType)
    .replace(/_/g, " ")
    .toLowerCase();
}
