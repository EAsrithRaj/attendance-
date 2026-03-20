import { useState, useEffect, useMemo } from "react";
import type { Subject, AttendanceRecord } from "@/types/attendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddExtraClassModalProps {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  date: string;
  records: AttendanceRecord[];
  onAdd: (subjectId: string, weight: number) => void;
}

export default function AddExtraClassModal({ open, onClose, subjects, date, records, onAdd }: AddExtraClassModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [isLab, setIsLab] = useState(false);

  // Auto-set lab if subject name contains "Lab"
  useEffect(() => {
    if (selectedId) {
      const sub = subjects.find((s) => s.id === selectedId);
      if (sub && /lab/i.test(sub.name)) {
        setIsLab(true);
      }
    }
  }, [selectedId, subjects]);

  // Android back gesture
  useEffect(() => {
    if (open) {
      window.history.pushState({ modal: true }, "");
      const handlePop = () => onClose();
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [open, onClose]);

  // Check for duplicate extra class
  const duplicateWarning = useMemo(() => {
    if (!selectedId) return null;
    const exists = records.some(
      (r) => r.subjectId === selectedId && r.date === date && r.isExtra
    );
    if (exists) {
      const sub = subjects.find((s) => s.id === selectedId);
      return `${sub?.name ?? "Subject"} already added as extra class on ${date}`;
    }
    return null;
  }, [selectedId, records, date, subjects]);

  const handleAdd = () => {
    if (!selectedId || duplicateWarning) return;
    onAdd(selectedId, isLab ? 3 : 1);
    setSelectedId("");
    setIsLab(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm animate-scale-in">
        <DialogHeader>
          <DialogTitle>Add Extra Class</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors active-press ${
                    selectedId === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground hover:bg-muted"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {duplicateWarning && (
            <p className="text-xs text-attendance-red font-medium">{duplicateWarning}</p>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsLab(false)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors active-press ${
                  !isLab ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                Theory
              </button>
              <button
                onClick={() => setIsLab(true)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors active-press ${
                  isLab ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                Lab
              </button>
            </div>
          </div>

          <Button onClick={handleAdd} disabled={!selectedId || !!duplicateWarning} className="min-h-[44px]">
            Add Extra Class
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
