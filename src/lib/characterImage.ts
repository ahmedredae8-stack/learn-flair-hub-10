// Resolve the picture to show for a character in a given mood.
// Uploaded mood pictures always win over the old preset avatar, so a character
// whose real artwork was uploaded never falls back to the default 3D preset.
const MOOD_ORDER = ["neutral", "happy", "excited", "thinking", "surprised", "sad"];

export function characterImage(
  c: { avatar_url?: string | null; moods?: unknown } | null | undefined,
  mood?: string | null,
): string | null {
  if (!c) return null;
  const moods = (c.moods ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof moods[k] === "string" && moods[k] ? (moods[k] as string) : null);

  if (mood) {
    const exact = pick(mood);
    if (exact) return exact;
  }
  for (const k of MOOD_ORDER) {
    const v = pick(k);
    if (v) return v;
  }
  const any = Object.values(moods).find((v) => typeof v === "string" && v);
  if (typeof any === "string") return any;
  return c.avatar_url ?? null;
}
