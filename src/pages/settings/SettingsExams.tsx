import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Trash2, Plus } from "lucide-react";

export default function SettingsExams() {
  const navigate = useNavigate();
  const { examPeriods, setExamPeriods } = useAppState();

  const [examStart, setExamStart] = useState("");
  const [examEnd, setExamEnd] = useState("");

  const addExam = () => {
    if (!examStart || !examEnd) return;
    setExamPeriods([
      ...examPeriods,
      { startDate: examStart, endDate: examEnd },
    ]);
    setExamStart("");
    setExamEnd("");
  };

  const removeExam = (i: number) =>
    setExamPeriods(examPeriods.filter((_, idx) => idx !== i));

  return (
    <PageShell
      title="Exam Periods"
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

        <Section title="Current Exam Periods">
          {examPeriods.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No exam periods added yet.
            </p>
          )}
          {examPeriods.map((ep, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 mb-2"
            >
              <span className="text-sm text-card-foreground font-mono">
                {ep.startDate} → {ep.endDate}
              </span>
              <Button variant="ghost" size="sm" onClick={() => removeExam(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </Section>

        <Section title="Add Exam Period">
          <div className="flex gap-2">
            <Input
              type="date"
              value={examStart}
              onChange={(e) => setExamStart(e.target.value)}
              className="flex-1"
            />
            <Input
              type="date"
              value={examEnd}
              onChange={(e) => setExamEnd(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={addExam}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Section>

      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
