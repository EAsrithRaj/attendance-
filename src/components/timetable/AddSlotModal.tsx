import { useState, useEffect } from "react";
import type { Subject } from "@/types/attendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddSlotModalProps {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  onAdd: (subjectId: string, isLab: boolean) => void;
}

export default function AddSlotModal({ open, onClose, subjects, onAdd }: AddSlotModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [isLab, setIsLab] = useState(false);

  // Android back gesture: close modal instead of navigating away
  useEffect(() => {
    if (open) {
      window.history.pushState({ modal: true }, "");
      const handlePop = () => onClose();
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [open, onClose]);

  const handleAdd = () => {
    if (!selectedId) return;
    onAdd(selectedId, isLab);
    setSelectedId("");
    setIsLab(false);
    // Keep modal open for quick multi-add
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm animate-scale-in">
        <DialogHeader>
          <DialogTitle>Add Class Slot</DialogTitle>
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
          <Button onClick={handleAdd} disabled={!selectedId} className="min-h-[44px]">
            Add Slot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
