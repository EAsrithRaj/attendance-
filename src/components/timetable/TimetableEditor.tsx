import { useState, useCallback } from "react";
import type { TimetableSlot, Subject } from "@/types/attendance";
import DayTabs, { DAYS, type DayName } from "./DayTabs";
import SlotItem from "./SlotItem";
import AddSlotModal from "./AddSlotModal";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DAY_MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function orderTime(order: number): string {
  const h = 8 + order;
  return `${String(h).padStart(2, "0")}:00`;
}

interface TimetableEditorProps {
  timetable: TimetableSlot[];
  subjects: Subject[];
  onSave: (slots: TimetableSlot[]) => void;
}

export default function TimetableEditor({ timetable, subjects, onSave }: TimetableEditorProps) {
  const [selectedDay, setSelectedDay] = useState<DayName>("Mon");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  const dow = DAY_MAP[selectedDay];

  // Get slots for current day, sorted by startTime
  const daySlots = timetable
    .filter((s) => s.dayOfWeek === dow)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const subMap = new Map(subjects.map((s) => [s.id, s]));

  const addSlot = useCallback((subjectId: string, isLab: boolean) => {
    const order = daySlots.length;
    const newSlot: TimetableSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subjectId,
      dayOfWeek: dow,
      startTime: orderTime(order),
      endTime: orderTime(order + 1),
      weight: isLab ? 3 : 1,
    };
    onSave([...timetable, newSlot]);
  }, [timetable, dow, daySlots.length, onSave]);

  const deleteSlot = useCallback(() => {
    if (deleteIdx === null) return;
    const slotToDelete = daySlots[deleteIdx];
    if (!slotToDelete) return;
    const next = timetable.filter((s) => s.id !== slotToDelete.id);
    // Re-order remaining day slots
    let order = 0;
    const reordered = next.map((s) => {
      if (s.dayOfWeek === dow) {
        const updated = { ...s, startTime: orderTime(order), endTime: orderTime(order + 1) };
        order++;
        return updated;
      }
      return s;
    });
    onSave(reordered);
    setDeleteIdx(null);
  }, [deleteIdx, daySlots, timetable, dow, onSave]);

  const moveSlot = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const reordered = [...daySlots];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Rebuild full timetable with updated order
    const otherSlots = timetable.filter((s) => s.dayOfWeek !== dow);
    const updatedDay = reordered.map((s, i) => ({
      ...s,
      startTime: orderTime(i),
      endTime: orderTime(i + 1),
    }));
    onSave([...otherSlots, ...updatedDay]);
  }, [daySlots, timetable, dow, onSave]);

  // Simple drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <div className="animate-fade-in">
      <DayTabs selected={selectedDay} onSelect={setSelectedDay} />

      <div className="mt-1">
        {daySlots.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No classes on {selectedDay}
          </div>
        )}
        {daySlots.map((slot, idx) => (
          <div
            key={slot.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => { if (dragIdx !== null) moveSlot(dragIdx, idx); setDragIdx(null); }}
            onDragEnd={() => setDragIdx(null)}
            className={`transition-opacity ${dragIdx === idx ? "opacity-50" : ""}`}
          >
            <SlotItem
              subject={subMap.get(slot.subjectId)}
              isLab={slot.weight === 3}
              onLongPress={() => setDeleteIdx(idx)}
            />
          </div>
        ))}
      </div>

      <div className="px-4 mt-4">
        <Button variant="outline" className="w-full min-h-[44px]" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Slot
        </Button>
      </div>

      <AddSlotModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        subjects={subjects}
        onAdd={addSlot}
      />

      <AlertDialog open={deleteIdx !== null} onOpenChange={(o) => !o && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the class from {selectedDay}'s schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSlot}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
