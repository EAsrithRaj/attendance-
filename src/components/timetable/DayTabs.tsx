import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayName = typeof DAYS[number];

interface DayTabsProps {
  selected: DayName;
  onSelect: (day: DayName) => void;
}

export { DAYS };

export default function DayTabs({ selected, onSelect }: DayTabsProps) {
  return (
    <div className="flex border-b border-border">
      {DAYS.map((day) => (
        <button
          key={day}
          onClick={() => onSelect(day)}
          className={cn(
            "flex-1 py-2.5 text-xs font-semibold tracking-wider transition-colors min-h-[44px] active-press",
            selected === day
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {day}
        </button>
      ))}
    </div>
  );
}
