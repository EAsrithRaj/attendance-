import type { TimetableSlot, Subject } from "@/types/attendance";
import { DAYS } from "./DayTabs";

const DAY_MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

interface TimetableGridProps {
  timetable: TimetableSlot[];
  subjects: Subject[];
}

export default function TimetableGrid({ timetable, subjects }: TimetableGridProps) {
  const subMap = new Map(subjects.map((s) => [s.id, s]));

  // Group slots by day, sorted by startTime (which encodes order)
  const daySlots: Record<number, TimetableSlot[]> = {};
  for (const slot of timetable) {
    if (!daySlots[slot.dayOfWeek]) daySlots[slot.dayOfWeek] = [];
    daySlots[slot.dayOfWeek].push(slot);
  }
  Object.values(daySlots).forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));

  const maxRows = Math.max(1, ...Object.values(daySlots).map((arr) => arr.length));

  return (
    <div className="overflow-x-auto -mx-3 sm:-mx-4">
      <div className="min-w-[500px] px-3 sm:px-4">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-semibold tracking-wider text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: maxRows }, (_, row) => (
          <div key={row} className="grid grid-cols-7 border-b border-border/30">
            {DAYS.map((day) => {
              const dow = DAY_MAP[day];
              const slot = daySlots[dow]?.[row];
              const sub = slot ? subMap.get(slot.subjectId) : undefined;
              return (
                <div
                  key={day}
                  className="flex items-center justify-center p-1.5 min-h-[56px] border-r border-border/20 last:border-r-0"
                >
                  {sub && (
                    <div className="text-center">
                      <span className="text-xs font-semibold text-foreground leading-tight block">
                        {sub.name}
                      </span>
                      {slot.weight === 3 && (
                        <span className="text-[10px] font-medium text-muted-foreground">LAB</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
