import { GripVertical } from "lucide-react";
import type { Subject } from "@/types/attendance";

interface SlotItemProps {
  subject: Subject | undefined;
  isLab: boolean;
  onLongPress: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export default function SlotItem({ subject, isLab, onLongPress, dragHandleProps }: SlotItemProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-border/50 transition-colors active-press select-none"
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      onTouchStart={() => {
        const timer = setTimeout(onLongPress, 500);
        const clear = () => { clearTimeout(timer); window.removeEventListener("touchend", clear); window.removeEventListener("touchmove", clear); };
        window.addEventListener("touchend", clear, { once: true });
        window.addEventListener("touchmove", clear, { once: true });
      }}
    >
      <div {...dragHandleProps} className="cursor-grab text-muted-foreground touch-none">
        <GripVertical className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-foreground">
        {subject?.name || "Unknown"}{isLab ? " LAB" : ""}
      </span>
    </div>
  );
}
