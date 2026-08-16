import wordmark from "@/assets/nilex-wordmark.png";
import { useBrandImage } from "@/lib/siteSettings";

export function NilexLogo({ className = "h-6", withText = false }: { className?: string; withText?: boolean }) {
  const src = useBrandImage("logo", wordmark);
  return (
    <span translate="no" className={`notranslate inline-flex items-center gap-2 ${className}`}>
      <img
        src={src}
        alt="nilex"
        className="h-full w-auto object-contain select-none"
        draggable={false}
      />
      {withText && <span className="sr-only">nilex</span>}
    </span>
  );
}
