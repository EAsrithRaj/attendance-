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

  const [startDate, setStartDate] = useState(semester.startDate);
  const [endDate, setEndDate] = useState(semester.endDate);

  const handleSave = () => {
    if (!startDate || !endDate) {
      toast.error("Both dates are required");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }
    setSemester({ startDate, endDate });
    toast.success("Semester saved");
    navigate("/settings");
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
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sem-start">Start Date</Label>
            <Input
              id="sem-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sem-end">End Date</Label>
            <Input
              id="sem-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {startDate && endDate && endDate >= startDate && (
          <p className="text-sm text-muted-foreground text-center">
            {Math.round(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )}{" "}
            days
          </p>
        )}

        <Button className="w-full" onClick={handleSave}>
          Save Semester
        </Button>
      </div>
    </PageShell>
  );
}
