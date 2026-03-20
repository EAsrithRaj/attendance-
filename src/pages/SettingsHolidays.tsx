import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import type { Holiday } from "@/types/attendance";
import { INDIAN_HOLIDAYS } from "@/data/holidays";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Plus,
  MapPin,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// ── Helper (same as Settings.tsx) ─────────────────────────────────────────────

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsHolidays() {
  const navigate = useNavigate();

  const {
    holidays,
    allHolidays,
    userState,
    deletedHolidayIds,
    setHolidays,
    deleteAutoHoliday,
    restoreAutoHoliday,
  } = useAppState();

  const [showDeleted, setShowDeleted] = useState(false);

  const [holStart, setHolStart] = useState("");
  const [holEnd, setHolEnd] = useState("");
  const [holName, setHolName] = useState("");

  const addHolidays = () => {
    if (!holStart) return;
    const effectiveEnd = holEnd || holStart;
    const dates = dateRange(holStart, effectiveEnd);
    if (dates.length === 0) return;

    const existingDates = new Set(holidays.map((h) => h.date));
    const newEntries: Holiday[] = dates
      .filter((d) => !existingDates.has(d))
      .map((d) => ({
        id: `manual_${d}_${Date.now()}`,
        date: d,
        name: holName.trim() || undefined,
        type: "manual" as const,
      }));

    if (newEntries.length > 0) {
      setHolidays([...holidays, ...newEntries]);
      toast.success(
        newEntries.length === 1
          ? "Holiday added"
          : `${newEntries.length} holidays added`,
      );
    } else {
      toast.info("All dates already exist");
    }

    setHolStart("");
    setHolEnd("");
    setHolName("");
  };

  const removeManualHoliday = (h: Holiday) => {
    if (h.id) {
      setHolidays(holidays.filter((m) => m.id !== h.id));
    } else {
      setHolidays(holidays.filter((m) => m.date !== h.date));
    }
  };

  // Grouped display
  const nationalHolidays = allHolidays.filter((h) => h.type === "national");
  const stateHolidays = allHolidays.filter((h) => h.type === "state");
  const manualHolidays = allHolidays.filter(
    (h) => h.type === "manual" || !h.type,
  );

  // Deleted auto holidays — sourced from bundled list, filtered by deletedHolidayIds
  const deletedAutoHolidays = INDIAN_HOLIDAYS.filter((h) =>
    deletedHolidayIds.includes(h.id),
  );

  return (
    <PageShell
      title="Holidays"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 pl-1"
          onClick={() => navigate("/settings")}
        >
          <ChevronLeft className="h-4 w-4" />
          Settings
        </Button>
      }
    >
      <div className="space-y-4 pb-20 animate-fade-in">
        {/* ── State detection banner ── */}
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            userState
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {userState
            ? `Auto holidays loaded for ${userState}`
            : "Showing national holidays only — location not detected"}
        </div>

        {/* ── National ── */}
        {nationalHolidays.length > 0 && (
          <HolidayGroup
            label="National"
            holidays={nationalHolidays}
            onDelete={(h) => h.id && deleteAutoHoliday(h.id)}
          />
        )}

        {/* ── State-specific ── */}
        {stateHolidays.length > 0 && (
          <HolidayGroup
            label="State"
            holidays={stateHolidays}
            onDelete={(h) => h.id && deleteAutoHoliday(h.id)}
          />
        )}

        {/* ── Manual ── */}
        {manualHolidays.length > 0 && (
          <HolidayGroup
            label="Manual"
            holidays={manualHolidays}
            onDelete={removeManualHoliday}
          />
        )}

        {nationalHolidays.length === 0 &&
          stateHolidays.length === 0 &&
          manualHolidays.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No holidays loaded yet.
            </p>
          )}

        {/* ── Restore deleted auto holidays ── */}
        {deletedAutoHolidays.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDeleted((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
            >
              <span>
                {deletedAutoHolidays.length} auto holiday
                {deletedAutoHolidays.length !== 1 ? "s" : ""} hidden — tap to
                restore
              </span>
              {showDeleted ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>

            {showDeleted && (
              <div className="px-3 pb-3 space-y-1 border-t border-amber-200/60 dark:border-amber-800/60 pt-2">
                {deletedAutoHolidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-md bg-white/60 dark:bg-black/20 px-2.5 py-1.5"
                  >
                    <span className="text-xs text-card-foreground font-mono">
                      {h.date}
                      {h.name && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {h.name}
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 shrink-0"
                      onClick={() => {
                        restoreAutoHoliday(h.id);
                        toast.success(`${h.name || "Holiday"} restored`);
                      }}
                      title="Restore holiday"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Add manual holiday ── */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Add Holiday
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Start date
              </Label>
              <Input
                type="date"
                value={holStart}
                onChange={(e) => setHolStart(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                End (optional)
              </Label>
              <Input
                type="date"
                value={holEnd}
                min={holStart || undefined}
                onChange={(e) => setHolEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Holiday name (optional)"
              value={holName}
              onChange={(e) => setHolName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addHolidays()}
            />
            <Button size="sm" onClick={addHolidays}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ── HolidayGroup sub-component ────────────────────────────────────────────────

function HolidayGroup({
  label,
  holidays,
  onDelete,
}: {
  label: string;
  holidays: Holiday[];
  onDelete: (h: Holiday) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <span className="block px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {holidays.map((h, i) => (
        <div
          key={h.id ?? `${h.date}-${i}`}
          className={`flex items-center justify-between px-4 py-2.5 ${
            i < holidays.length - 1 ? "border-b border-border/60" : ""
          }`}
        >
          <span className="text-sm text-card-foreground font-mono truncate mr-2">
            {h.date}
            {h.name && (
              <span className="text-muted-foreground"> — {h.name}</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive/10 shrink-0"
            onClick={() => onDelete(h)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
