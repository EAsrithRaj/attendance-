import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import PageShell from "@/components/PageShell";
import TimetableGrid from "@/components/timetable/TimetableGrid";
import TimetableEditor from "@/components/timetable/TimetableEditor";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, Check } from "lucide-react";

export default function SettingsTimetable() {
  const navigate = useNavigate();
  const { subjects, timetable, setTimetable } = useAppState();
  const [editing, setEditing] = useState(false);

  return (
    <PageShell
      title="Timetable"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 pl-1"
            onClick={() => navigate("/settings")}
          >
            <ChevronLeft className="h-4 w-4" />
            Settings
          </Button>
          <Button
            size="icon"
            variant={editing ? "default" : "ghost"}
            className="h-9 w-9"
            onClick={() => setEditing(!editing)}
          >
            {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
        </div>
      }
    >
      {subjects.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground animate-fade-in">
          Add subjects first before setting up your timetable.
        </div>
      ) : editing ? (
        <TimetableEditor
          subjects={subjects}
          timetable={timetable}
          onChange={setTimetable}
        />
      ) : (
        <TimetableGrid
          subjects={subjects}
          timetable={timetable}
        />
      )}
    </PageShell>
  );
}
