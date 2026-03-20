import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import type { Holiday } from "@/types/attendance";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

export default function SettingsHolidays() {
  const navigate = useNavigate();
  const {
    allHolidays, holidays, userState,
    setHolidays, deleteAutoHoliday,
  } = useAppState();

  const [holStart, setHolStart] = useState("");
  const [holEnd, setHolEnd]     = useState("");
  const [holName, setHolName]   = useState("");

  const nationalHolidays = allHolidays.filter((h) => h.type === "national");
  const stateHolidays    = allHolidays.filter((h) => h.type === "state");
  const manualHolidays   = allHolidays.filter((h) => h.type === "manual" || !h.type);

  const addHolidays = () => {
    if (!holStart) return;
    const effectiveEnd = holEnd || holStart;
    const dates = dateRange(holStart, effectiveEnd);
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
      toast.success(newEntries.length === 1 ? "Holiday added" : `${newEntries.length} holidays added`);
    } else {
      toast.info("All dates already exist");
    }

    setHolStart(""); setHolEnd(""); setHolName("");
  };

  const removeManualHoliday = (h: Holiday) => {
    if (h.id) setHolidays(holidays.filter((m) => m.id !== h.id));
    else setHolidays(holidays.filter((m) => m.date !== h.date));
  };

  return (
    <PageShell
      title="Holidays"
      actions={
        <Button variant="ghost" size="sm" className="gap-1 pl-1" onClick={() => navigate("/settings")}>
          <ChevronLeft className="h-4 w-4" />
          Settings
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">

        {/* Location banner */}
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${userState ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {userState ? `Holidays loaded for ${userState}` : "Showing national holidays only"}
        </div>

        {/* National */}
        {nationalHolidays.length > 0 && (
          <HolidayGroup label="National" holidays={nationalHolidays} onDelete={(h) => h.id && deleteAutoHoliday(h.id)} />
        )}

        {/* State */}
        {stateHolidays.length > 0 && (
          <HolidayGroup label="State" holidays={stateHolidays} onDelete={(h) => h.id && deleteAutoHoliday(h.id)} />
        )}

        {/* Manual */}
        {manualHolidays.length > 0 && (
          <HolidayGroup label="Manual" holidays={manualHolidays} onDelete={removeManualHoliday} />
        )}

        {nationalHolidays.length === 0 && stateHolidays.length === 0 && manualHolidays.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No holidays yet.</p>
        )}

        {/* Add form */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Add Holiday</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input type="date" value={holStart} onChange={(e) => setHolStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End date (optional)</Label>
              <Input type="date" value={holEnd} min={holStart || undefined} onChange={(e) => setHolEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Holiday name"
              value={holName}
              onChange={(e) => setHolName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHolidays()}
              className="flex-1"
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

function HolidayGroup({ label, holidays, onDelete }: { label: string; holidays: Holiday[]; onDelete: (h: Holiday) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-2">{label}</span>
      {holidays.map((h, i) => (
        <div key={h.id ?? `${h.date}-${i}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 mb-1.5">
          <span className="text-sm text-card-foreground font-mono">
            {h.date}
            {h.name && <span className="text-muted-foreground"> — {h.name}</span>}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-destructive/10" onClick={() => onDelete(h)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
