import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function SettingsSemester() {
  const navigate = useNavigate();
  const { semester, setSemester } = useAppState();

  const [semStart, setSemStart] = useState(semester.startDate);
  const [semEnd, setSemEnd] = useState(semester.endDate);

  const saveSem = () => {
    setSemester({ startDate: semStart, endDate: semEnd });
    toast.success("Semester saved");
  };

  return (
    <PageShell
      title="Semester"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input
                type="date"
                value={semStart}
                onChange={(e) => setSemStart(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End date</Label>
              <Input
                type="date"
                value={semEnd}
                onChange={(e) => setSemEnd(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={saveSem} className="mt-3 w-full">
            Save Semester
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
