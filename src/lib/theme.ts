import { useEffect } from "react";
import { useSiteSettings } from "@/lib/siteSettings";

/**
 * Theme presets controlled from the database (`site_settings.theme_preset`).
 * The admin can switch the whole platform between the purple identity and the
 * older blue one, or set a fully custom primary colour.
 */
export type PresetId = "purple" | "blue" | "green" | "sunset" | "nilo";

type Vars = Record<string, string>;

export const THEME_PRESETS: { id: PresetId; label: string; swatch: string; vars: Vars }[] = [
  {
    id: "purple",
    label: "بنفسجي",
    swatch: "#7c3aed",
    vars: {
      "--background": "oklch(0.99 0.01 300)",
      "--foreground": "oklch(0.2 0.04 295)",
      "--primary": "oklch(0.55 0.22 295)",
      "--primary-shadow": "oklch(0.44 0.2 295)",
      "--secondary": "oklch(0.95 0.04 295)",
      "--secondary-foreground": "oklch(0.4 0.15 295)",
      "--muted": "oklch(0.96 0.015 300)",
      "--muted-foreground": "oklch(0.5 0.035 300)",
      "--accent": "oklch(0.68 0.18 320)",
      "--accent-shadow": "oklch(0.56 0.18 320)",
      "--border": "oklch(0.9 0.02 300)",
      "--input": "oklch(0.92 0.02 300)",
      "--ring": "oklch(0.55 0.22 295)",
      "--gem": "oklch(0.7 0.16 300)",
    },
  },
  {
    id: "blue",
    label: "أزرق",
    swatch: "#3b82f6",
    vars: {
      "--background": "oklch(0.99 0.008 240)",
      "--foreground": "oklch(0.2 0.035 250)",
      "--primary": "oklch(0.62 0.16 250)",
      "--primary-shadow": "oklch(0.5 0.15 250)",
      "--secondary": "oklch(0.95 0.03 245)",
      "--secondary-foreground": "oklch(0.38 0.12 250)",
      "--muted": "oklch(0.96 0.012 240)",
      "--muted-foreground": "oklch(0.5 0.03 245)",
      "--accent": "oklch(0.75 0.12 230)",
      "--accent-shadow": "oklch(0.6 0.13 230)",
      "--border": "oklch(0.9 0.02 240)",
      "--input": "oklch(0.92 0.02 240)",
      "--ring": "oklch(0.62 0.16 250)",
      "--gem": "oklch(0.7 0.15 235)",
    },
  },
  {
    id: "green",
    label: "أخضر",
    swatch: "#22c55e",
    vars: {
      "--background": "oklch(0.99 0.01 150)",
      "--foreground": "oklch(0.2 0.04 160)",
      "--primary": "oklch(0.6 0.17 150)",
      "--primary-shadow": "oklch(0.48 0.16 150)",
      "--secondary": "oklch(0.95 0.04 150)",
      "--secondary-foreground": "oklch(0.38 0.12 155)",
      "--muted": "oklch(0.96 0.015 150)",
      "--muted-foreground": "oklch(0.5 0.03 155)",
      "--accent": "oklch(0.72 0.15 175)",
      "--accent-shadow": "oklch(0.58 0.15 175)",
      "--border": "oklch(0.9 0.02 150)",
      "--input": "oklch(0.92 0.02 150)",
      "--ring": "oklch(0.6 0.17 150)",
      "--gem": "oklch(0.7 0.15 190)",
    },
  },
  {
    id: "sunset",
    label: "غروب",
    swatch: "#f97316",
    vars: {
      "--background": "oklch(0.99 0.012 60)",
      "--foreground": "oklch(0.22 0.04 45)",
      "--primary": "oklch(0.66 0.2 45)",
      "--primary-shadow": "oklch(0.54 0.19 40)",
      "--secondary": "oklch(0.95 0.04 60)",
      "--secondary-foreground": "oklch(0.42 0.13 45)",
      "--muted": "oklch(0.96 0.015 60)",
      "--muted-foreground": "oklch(0.5 0.03 50)",
      "--accent": "oklch(0.72 0.17 20)",
      "--accent-shadow": "oklch(0.58 0.18 20)",
      "--border": "oklch(0.91 0.02 60)",
      "--input": "oklch(0.93 0.02 60)",
      "--ring": "oklch(0.66 0.2 45)",
      "--gem": "oklch(0.72 0.15 80)",
    },
  },
  {
    // Nilo — matches the mascot: cyan-blue ibis feathers + orange beak accent
    id: "nilo",
    label: "نيلو",
    swatch: "#2bb6e8",
    vars: {
      "--background": "oklch(0.99 0.012 225)",
      "--foreground": "oklch(0.22 0.05 245)",
      "--primary": "oklch(0.68 0.15 230)",
      "--primary-shadow": "oklch(0.55 0.14 235)",
      "--secondary": "oklch(0.95 0.04 225)",
      "--secondary-foreground": "oklch(0.4 0.12 235)",
      "--muted": "oklch(0.96 0.015 225)",
      "--muted-foreground": "oklch(0.5 0.03 235)",
      "--accent": "oklch(0.74 0.17 55)",
      "--accent-shadow": "oklch(0.62 0.17 50)",
      "--border": "oklch(0.9 0.025 225)",
      "--input": "oklch(0.92 0.025 225)",
      "--ring": "oklch(0.68 0.15 230)",
      "--gem": "oklch(0.74 0.14 215)",
    },
  },
];

export const DEFAULT_PRESET: PresetId = "purple";

function applyVars(vars: Vars) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

/** Applies the DB-selected palette to the document. Rendered once in the root. */
export function ThemeApplier() {
  const { data } = useSiteSettings();
  const preset = (data?.["theme_preset" as never] as string | undefined) ?? DEFAULT_PRESET;
  const custom = data?.["theme_primary" as never] as string | undefined;

  useEffect(() => {
    const found = THEME_PRESETS.find((p) => p.id === preset) ?? THEME_PRESETS[0]!;
    applyVars(found.vars);
    if (custom && /^#?[0-9a-fA-F]{6}$/.test(custom.trim())) {
      const hex = custom.trim().startsWith("#") ? custom.trim() : `#${custom.trim()}`;
      const root = document.documentElement;
      root.style.setProperty("--primary", hex);
      root.style.setProperty("--ring", hex);
      root.style.setProperty("--primary-shadow", `color-mix(in oklab, ${hex} 78%, black)`);
    }
  }, [preset, custom]);

  return null;
}
