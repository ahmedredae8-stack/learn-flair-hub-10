import { resolveAvatar } from "@/lib/avatars";

export function AvatarBubble({
  id,
  size = 48,
  ring = false,
}: {
  id: string | null | undefined;
  size?: number;
  ring?: boolean;
}) {
  const a = resolveAvatar(id);
  return (
    <div
      translate="no"
      className={`notranslate rounded-full overflow-hidden shrink-0 grid place-items-center ${ring ? "ring-4 ring-primary/40" : ""}`}
      style={{ width: size, height: size, background: a.bg }}
      aria-label={a.label}
    >
      <img
        src={a.src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
