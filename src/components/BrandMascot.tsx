import { useEffect, useState } from "react";
import mascotAsset from "@/assets/mascot.png";
import { useBrandImage, type SettingKey } from "@/lib/siteSettings";

/**
 * Nilo — the platform mascot (blue ibis).
 * Idle-animated, and can "speak" a short line in a Duolingo-style bubble.
 */
export function BrandMascot({
  slot = "mascot",
  className = "",
  size = 64,
  alt = "نيلو",
  says,
  animate = true,
}: {
  slot?: SettingKey;
  className?: string;
  size?: number;
  alt?: string;
  /** Optional speech line typed out next to Nilo. */
  says?: string;
  animate?: boolean;
}) {
  const src = useBrandImage(slot, mascotAsset);
  const typed = useTyped(says ?? "");

  const img = (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`${animate ? "animate-float" : ""} select-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] ${className}`}
      draggable={false}
    />
  );

  if (!says) return img;

  return (
    <div className="flex items-end gap-2">
      {img}
      <div className="relative max-w-[220px] rounded-2xl border-2 border-border bg-card px-3 py-2 text-xs font-extrabold leading-5 animate-bob">
        {typed}
        <span className="inline-block w-1 animate-hint-up">|</span>
        <span className="absolute -start-1.5 bottom-3 h-3 w-3 rotate-45 border-b-2 border-s-2 border-border bg-card" />
      </div>
    </div>
  );
}

/** Types the text out one character at a time so Nilo feels alive. */
function useTyped(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 35);
    return () => clearInterval(id);
  }, [text]);
  return text.slice(0, n);
}
