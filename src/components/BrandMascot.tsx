import mascotAsset from "@/assets/mascot.png";
import { useBrandImage, type SettingKey } from "@/lib/siteSettings";

/** Mascot image whose source can be changed any time from the admin panel. */
export function BrandMascot({
  slot = "mascot",
  className = "",
  size = 64,
  alt = "",
}: {
  slot?: SettingKey;
  className?: string;
  size?: number;
  alt?: string;
}) {
  const src = useBrandImage(slot, mascotAsset);
  return <img src={src} alt={alt} width={size} height={size} className={className} />;
}
