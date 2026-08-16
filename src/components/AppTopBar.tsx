import { NotificationsButton } from "@/components/NotificationsButton";
import { NilexLogo } from "@/components/NilexLogo";
import { Flame, Gem, Heart } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { Link } from "@tanstack/react-router";
import { AvatarBubble } from "@/components/AvatarBubble";
import { EconomySheet } from "@/components/EconomySheet";
import { regenerated } from "@/lib/economy";
import { useState } from "react";

export function AppTopBar() {
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const hearts = profile ? regenerated(profile).hearts : 5;

  return (
    <header translate="no" className="notranslate sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotificationsButton />
          <NilexLogo className="h-8 sm:h-9" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="flex items-center gap-3" aria-label="طاقتك">
            <Stat icon={<Flame className="w-5 h-5" />} value={String(profile?.streak ?? 0)} color="text-streak" />
            <Stat icon={<Gem className="w-5 h-5" />} value={String(profile?.gems ?? 0)} color="text-gem" />
            <Stat icon={<Heart className="w-5 h-5 fill-current" />} value={String(hearts)} color="text-heart" />
          </button>
          <Link to="/profile" aria-label="الملف">
            <AvatarBubble id={profile?.avatar_url} size={36} />
          </Link>
        </div>
      </div>
      <EconomySheet open={open} onClose={() => setOpen(false)} />
    </header>
  );
}

function Stat({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-1 font-extrabold ${color}`}>
      {icon}
      <span className="text-base text-foreground">{value}</span>
    </div>
  );
}
