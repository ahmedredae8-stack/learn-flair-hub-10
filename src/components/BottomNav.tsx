import { Link, useRouterState } from "@tanstack/react-router";
import { Home, GraduationCap, Rocket, Trophy, User, Shield } from "lucide-react";
import { useIsAdmin } from "@/lib/useIsAdmin";

const baseItems = [
  { icon: Home, label: "الرئيسية", to: "/" as const },
  { icon: GraduationCap, label: "الكورسات", to: "/courses" as const },
  { icon: Rocket, label: "المشاريع", to: "/projects" as const },
  { icon: Trophy, label: "الترتيب", to: "/leaderboard" as const },
  { icon: User, label: "الملف", to: "/profile" as const },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();
  const items = isAdmin
    ? [...baseItems, { icon: Shield, label: "أدمن", to: "/admin" as const }]
    : baseItems;
  const cols = isAdmin ? "grid-cols-6" : "grid-cols-5";
  return (
    <nav translate="no" className="notranslate fixed bottom-0 inset-x-0 z-20 bg-card border-t-2 border-border">
      <div className={`mx-auto max-w-2xl grid ${cols}`}>
        {items.map(({ icon: Icon, label, to }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl m-1 transition ${
                active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-extrabold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
