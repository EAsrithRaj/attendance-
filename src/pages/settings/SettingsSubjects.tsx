import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import type { Subject } from "@/types/attendance";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Trash2, Plus } from "lucide-react";

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export default function SettingsSubjects() {
  const navigate = useNavigate();
  const { subjects, timetable, setSubjects, setTimetable } = useAppState();

  const [newSubName, setNewSubName] = useState("");
  const [newSubMin, setNewSubMin] = useState("75");
  const [newSubTarget, setNewSubTarget] = useState("");
  const subNameRef = useRef<HTMLInputElement>(null);

  const addSubject = () => {
    if (!newSubName.trim()) return;
    const id = newSubName.trim().toUpperCase().replace(/\s+/g, "_");
    if (subjects.some((s) => s.id === id)) return;
    const min = Number(newSubMin) || 75;
    const next: Subject = {
      id,
      name: newSubName.trim(),
      minimumRequiredPercentage: clampPct(min) || 75,
    };
    const tgtRaw = newSubTarget.trim();
    if (tgtRaw !== "") {
      const t = Number(tgtRaw);
      if (Number.isFinite(t)) {
        next.targetPercentage = clampPct(Math.max(next.minimumRequiredPercentage, t));
      }
    }
    setSubjects([...subjects, next]);
    setNewSubName("");
    setNewSubMin("75");
    setNewSubTarget("");
    setTimeout(() => subNameRef.current?.focus(), 0);
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id));
    setTimetable(timetable.filter((t) => t.subjectId !== id));
  };

  const updateSubjectMin = (id: string, raw: string) => {
    const min = clampPct(Number(raw)) || 75;
    setSubjects(
      subjects.map((s) => {
        if (s.id !== id) return s;
        let target = s.targetPercentage;
        if (target !== undefined && target < min) target = min;
        return {
          ...s,
          minimumRequiredPercentage: min,
          ...(target !== undefined ? { targetPercentage: target } : {}),
        };
      }),
    );
  };

  const updateSubjectTarget = (id: string, raw: string) => {
    const sub = subjects.find((x) => x.id === id);
    if (!sub) return;
    const min = sub.minimumRequiredPercentage;
    const v = raw.trim();
    if (v === "") {
      setSubjects(
        subjects.map((s) =>
          s.id === id ? { ...s, targetPercentage: undefined } : s,
        ),
      );
      return;
    }
    const t = Number(v);
    if (!Number.isFinite(t)) return;
    const target = clampPct(Math.max(min, t));
    setSubjects(
      subjects.map((s) =>
        s.id === id ? { ...s, targetPercentage: target } : s,
      ),
    );
  };

  return (
    <PageShell
      title="Subjects"
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
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          {subjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2 mb-2">
              No subjects yet.
            </p>
          )}
          {subjects.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-muted/50 px-3 py-2 mb-2"
            >
              <span className="text-sm text-card-foreground font-medium shrink-0">
                {s.name}
              </span>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Min
                  </span>
                  <Input
                    type="number"
                    aria-label={`${s.name} minimum %`}
                    value={String(s.minimumRequiredPercentage)}
                    onChange={(e) => updateSubjectMin(s.id, e.target.value)}
                    className="h-8 w-14 text-xs px-2"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Target
                  </span>
                  <Input
                    type="number"
                    placeholder="—"
                    aria-label={`${s.name} target % optional`}
                    value={
                      s.targetPercentage === undefined
                        ? ""
                        : String(s.targetPercentage)
                    }
                    onChange={(e) => updateSubjectTarget(s.id, e.target.value)}
                    className="h-8 w-14 text-xs px-2"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => removeSubject(s.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 mt-2 items-end">
            <Input
              ref={subNameRef}
              placeholder="Subject name"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
              className="flex-1 min-w-[140px]"
            />
            <Input
              type="number"
              placeholder="Min %"
              aria-label="New subject minimum percentage"
              value={newSubMin}
              onChange={(e) => setNewSubMin(e.target.value)}
              className="w-20"
            />
            <Input
              type="number"
              placeholder="Target % (opt)"
              aria-label="New subject target percentage optional"
              value={newSubTarget}
              onChange={(e) => setNewSubTarget(e.target.value)}
              className="w-28"
            />
            <Button size="sm" onClick={addSubject} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
