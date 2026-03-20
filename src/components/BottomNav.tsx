import { NavLink as RouterNavLink } from "react-router-dom";
import { Home, Grid3X3, CalendarDays, BookOpen, Settings } from "lucide-react";

const links = [
  { to: "/", label: "Today", icon: Home },
  { to: "/timetable", label: "Timetable", icon: Grid3X3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1.5">
        {links.map(({ to, label, icon: Icon }) => (
          <RouterNavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 min-h-[44px] min-w-[44px] text-xs font-medium transition-colors active-press ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
}
