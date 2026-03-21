import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import type { Subject } from "@/types/attendance";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Trash2, Plus } from "lucide-react";

export default function SettingsSubjects() {
  const navigate = useNavigate();
  const { subjects, timetable, setSubjects, setTimetable } = useAppState();

  const [newSubName, setNewSubName] = useState("");
  const [newSubMin, setNewSubMin] = useState("75");
  const subNameRef = useRef<HTMLInputElement>(null);

  const addSubject = () => {
    if (!newSubName.trim()) return;
    const id = newSubName.trim().toUpperCase().replace(/\s+/g, "_");
    if (subjects.some((s) => s.id === id)) return;
    setSubjects([
      ...subjects,
      {
        id,
        name: newSubName.trim(),
        minimumRequiredPercentage: Number(newSubMin) || 75,
      },
    ]);
    setNewSubName("");
    setNewSubMin("75");
    setTimeout(() => subNameRef.current?.focus(), 0);
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id));
    setTimetable(timetable.filter((t) => t.subjectId !== id));
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
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 mb-2"
            >
              <span className="text-sm text-card-foreground">
                {s.name}{" "}
                <span className="text-muted-foreground">
                  ({s.minimumRequiredPercentage}%)
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSubject(s.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Input
              ref={subNameRef}
              placeholder="Subject name"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Min %"
              value={newSubMin}
              onChange={(e) => setNewSubMin(e.target.value)}
              className="w-20"
            />
            <Button size="sm" onClick={addSubject}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
