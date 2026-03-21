import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import PageShell from "@/components/PageShell";
import {
  ChevronRight,
  CalendarDays,
  BookOpen,
  Bell,
  Palmtree,
  Download,
  Palette,
} from "lucide-react";

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const { subjects, allHolidays } = useAppState();

  return (
    <PageShell title="Settings">
      <div className="space-y-6 pb-24">

        {/* ── Navigation menu only ───────────────────────── */}
        <nav className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
          {MENU_ITEMS(subjects.length, allHolidays.length).map(
            (item, i, arr) => (
              <button
                key={item.route}
                type="button"
                onClick={() => navigate(item.route)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors ${
                  i < arr.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-card-foreground">
                    {item.label}
                  </span>
                  {item.subtitle && (
                    <span className="block text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </span>
                  )}
                </span>

                <span className="flex items-center gap-2 shrink-0">
                  {item.badge != null && item.badge > 0 && (
                    <span className="text-[11px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5 leading-none">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            )
          )}
        </nav>

      </div>
    </PageShell>
  );
}

// ── Settings menu items ───────────────────────────────────────────────────────


interface MenuItem {
  label: string;
  subtitle?: string;
  route: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: number;
}

function MENU_ITEMS(
  subjectCount: number,
  holidayCount: number,
): MenuItem[] {
  return [
    {
      label: "Semester",
      subtitle: "Set start and end dates",
      route: "/settings/semester",
      icon: CalendarDays,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Subjects",
      subtitle: "Manage your subjects",
      route: "/settings/subjects",
      icon: BookOpen,
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      badge: subjectCount,
    },
    {
      label: "Exam Periods",
      subtitle: "Manage exam schedules",
      route: "/settings/exams",
      icon: CalendarDays,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Holidays",
      subtitle: "Auto + manual holidays",
      route: "/settings/holidays",
      icon: Palmtree,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      badge: holidayCount,
    },
    {
      label: "Notifications",
      subtitle: "Manage alerts",
      route: "/settings/notifications",
      icon: Bell,
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
    },
    {
      label: "Data",
      subtitle: "Backup, restore, reset",
      route: "/settings/data",
      icon: Download,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      label: "Appearance",
      subtitle: "Theme and display",
      route: "/settings/appearance",
      icon: Palette,
      iconBg: "bg-pink-100 dark:bg-pink-900/30",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
  ];
}