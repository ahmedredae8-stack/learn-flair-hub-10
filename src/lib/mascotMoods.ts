// Ready-made poses of the app mascot (same robot, six expressions).
// Served from /public so they work in the app and inside the admin panel.
export const MASCOT_MOODS: Record<string, string> = {
  neutral: "/brand/moods/neutral.png",
  happy: "/brand/moods/happy.png",
  sad: "/brand/moods/sad.png",
  surprised: "/brand/moods/surprised.png",
  thinking: "/brand/moods/thinking.png",
  excited: "/brand/moods/excited.png",
};

/** Image for a mascot mood, falling back to the neutral pose. */
export function mascotMood(mood?: string | null): string {
  return (mood && MASCOT_MOODS[mood]) || MASCOT_MOODS["neutral"]!;
}
