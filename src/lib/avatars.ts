// Preset avatar images — generated 3D characters.
import boy from "@/assets/avatar-boy.png";
import girl from "@/assets/avatar-girl.png";
import robot from "@/assets/avatar-robot.png";
import wizard from "@/assets/avatar-wizard.png";
import ninja from "@/assets/avatar-ninja.png";
import astro from "@/assets/avatar-astro.png";

export type AvatarPreset = {
  id: string;
  label: string;
  src: string;
  bg: string;
};

export const AVATARS: AvatarPreset[] = [
  { id: "boy", label: "ولد", src: boy, bg: "oklch(0.88 0.08 295)" },
  { id: "girl", label: "بنت", src: girl, bg: "oklch(0.9 0.08 340)" },
  { id: "robot", label: "روبوت", src: robot, bg: "oklch(0.88 0.1 200)" },
  { id: "wizard", label: "ساحر", src: wizard, bg: "oklch(0.82 0.12 290)" },
  { id: "ninja", label: "نينجا", src: ninja, bg: "oklch(0.25 0.02 280)" },
  { id: "astro", label: "رائد فضاء", src: astro, bg: "oklch(0.88 0.08 240)" },
];

const MAP = new Map(AVATARS.map((a) => [a.id, a]));

/**
 * Resolve an avatar identifier into a displayable image URL.
 * - Preset IDs → bundled asset URL
 * - Absolute URL (http/https or storage path) → used as-is
 * - null/unknown → default boy
 */
export function resolveAvatar(id: string | null | undefined): { src: string; bg: string; label: string } {
  if (!id) return { src: AVATARS[0].src, bg: AVATARS[0].bg, label: AVATARS[0].label };
  const preset = MAP.get(id);
  if (preset) return { src: preset.src, bg: preset.bg, label: preset.label };
  // Treat as external URL (uploaded custom avatar)
  if (id.startsWith("http") || id.startsWith("/")) {
    return { src: id, bg: "oklch(0.95 0.02 290)", label: "مخصّص" };
  }
  return { src: AVATARS[0].src, bg: AVATARS[0].bg, label: AVATARS[0].label };
}

export function getAvatar(id: string | null | undefined) {
  return resolveAvatar(id);
}
