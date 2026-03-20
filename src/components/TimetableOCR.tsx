import { useState, useRef, useCallback, useMemo } from "react";
import { useAppState } from "@/context/AppContext";
import type { TimetableSlot } from "@/types/attendance";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Camera,
  Loader2,
  Check,
  X,
  Beaker,
  AlertTriangle,
} from "lucide-react";

/* ── Constants ─────────────────────────────────── */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DEFAULT_PERIODS = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
];

const IGNORE_TOKENS = new Set([
  "library", "sports", "lunch", "break", "recess",
  "free", "nil", "holiday", "interval",
]);

type CellData = { subjectId: string; isLab: boolean } | null;

/* ── Image preprocessing ───────────────────────── */

function preprocessImage(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Grayscale + contrast
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Increase contrast
        const contrast = 1.5;
        const val = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
        d[i] = d[i + 1] = d[i + 2] = val;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    reader.readAsDataURL(file);
  });
}

/* ── Main Component ────────────────────────────── */

export default function TimetableOCR() {
  const { subjects, timetable, setTimetable } = useAppState();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "processing" | "tokens" | "grid">("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrTokens, setOcrTokens] = useState<string[]>([]);
  const [grid, setGrid] = useState<CellData[][]>(() => createEmptyGrid());
  const [cellSelector, setCellSelector] = useState<{ day: number; period: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [ocrError, setOcrError] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const ocrResultCache = useRef<string[]>([]);

  const subjectNames = useMemo(
    () => subjects.map((s) => ({ id: s.id, name: s.name, upper: s.name.toUpperCase() })),
    [subjects]
  );

  function createEmptyGrid(): CellData[][] {
    return DAYS.map(() => DEFAULT_PERIODS.map(() => null));
  }

  /* ── File handling ── */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* ── OCR ── */

  const runOCR = useCallback(async () => {
    if (!fileRef.current?.files?.[0]) return;
    setStep("processing");
    setOcrProgress(0);
    setOcrError(false);

    try {
      const processedImg = await preprocessImage(fileRef.current.files[0]);

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { progress: number }) => {
          if (typeof m.progress === "number") setOcrProgress(Math.round(m.progress * 100));
        },
      });

      const { data } = await worker.recognize(processedImg);
      await worker.terminate();

      // Tokenize
      const raw = data.text
        .split(/[\s,;|]+/)
        .map((t) => t.replace(/[^A-Za-z0-9-]/g, "").trim())
        .filter((t) => t.length >= 2);

      // Deduplicate
      const unique = [...new Set(raw)];
      ocrResultCache.current = unique;
      setOcrTokens(unique);

      // Prefill grid
      const newGrid = createEmptyGrid();
      const matchedSubjects = new Set<string>();
      for (const token of unique) {
        const upper = token.toUpperCase();
        if (IGNORE_TOKENS.has(upper.toLowerCase())) continue;
        const match = subjectNames.find(
          (s) =>
            s.upper === upper ||
            s.upper.includes(upper) ||
            upper.includes(s.upper) ||
            s.upper.split(/\s+/).some((w) => w.length >= 3 && upper.includes(w))
        );
        if (match) matchedSubjects.add(match.id);

        // Check for LAB
        if (upper.includes("LAB") && match) {
          matchedSubjects.add(match.id + ":lab");
        }
      }

      setGrid(newGrid);
      setStep("tokens");
    } catch (err) {
      console.error("OCR failed:", err);
      setOcrError(true);
      setStep("tokens");
    }
  }, [subjectNames]);

  /* ── Grid editing ── */

  const setCell = (day: number, period: number, data: CellData) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[day][period] = data;
      return next;
    });
    setCellSelector(null);
  };

  /* ── Token classification ── */

  const classifyToken = (token: string): "match" | "ignore" | "unknown" => {
    const upper = token.toUpperCase();
    if (IGNORE_TOKENS.has(token.toLowerCase())) return "ignore";
    if (
      subjectNames.some(
        (s) =>
          s.upper === upper ||
          s.upper.includes(upper) ||
          upper.includes(s.upper) ||
          s.upper.split(/\s+/).some((w) => w.length >= 3 && upper.includes(w))
      )
    )
      return "match";
    return "unknown";
  };

  /* ── Validation & Save ── */

  const validateAndSave = () => {
    // Collect filled cells
    const slots: TimetableSlot[] = [];
    const dupeCheck = new Set<string>();
    let valid = true;

    for (let d = 0; d < DAYS.length; d++) {
      for (let p = 0; p < DEFAULT_PERIODS.length; p++) {
        const cell = grid[d][p];
        if (!cell) continue;
        if (!cell.subjectId) { valid = false; continue; }

        const weight = cell.isLab ? 3 : 1;
        const key = `${cell.subjectId}-${d + 1}-${DEFAULT_PERIODS[p].start}`;
        if (dupeCheck.has(key)) { valid = false; continue; }
        dupeCheck.add(key);

        slots.push({
          id: `slot-ocr-${Date.now()}-${d}-${p}`,
          subjectId: cell.subjectId,
          dayOfWeek: d + 1,
          startTime: DEFAULT_PERIODS[p].start,
          endTime: DEFAULT_PERIODS[p].end,
          weight,
        });
      }
    }

    if (slots.length === 0) return;
    if (!valid) return; // has issues

    if (timetable.length > 0) {
      setConfirmDialog(true);
    } else {
      setTimetable(slots);
      closeAll();
    }
  };

  const doSave = (mode: "replace" | "merge") => {
    const slots: TimetableSlot[] = [];
    for (let d = 0; d < DAYS.length; d++) {
      for (let p = 0; p < DEFAULT_PERIODS.length; p++) {
        const cell = grid[d][p];
        if (!cell || !cell.subjectId) continue;
        slots.push({
          id: `slot-ocr-${Date.now()}-${d}-${p}`,
          subjectId: cell.subjectId,
          dayOfWeek: d + 1,
          startTime: DEFAULT_PERIODS[p].start,
          endTime: DEFAULT_PERIODS[p].end,
          weight: cell.isLab ? 3 : 1,
        });
      }
    }

    if (mode === "replace") {
      setTimetable(slots);
    } else {
      // Merge: add new slots, skip duplicates
      const existing = new Set(
        timetable.map((s) => `${s.subjectId}-${s.dayOfWeek}-${s.startTime}`)
      );
      const merged = [...timetable];
      for (const s of slots) {
        const key = `${s.subjectId}-${s.dayOfWeek}-${s.startTime}`;
        if (!existing.has(key)) merged.push(s);
      }
      setTimetable(merged);
    }
    closeAll();
  };

  const closeAll = () => {
    setIsOpen(false);
    setStep("upload");
    setImagePreview(null);
    setOcrTokens([]);
    setGrid(createEmptyGrid());
    setConfirmDialog(false);
    setOcrError(false);
    setCellSelector(null);
  };

  const filledCount = grid.flat().filter(Boolean).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="active-press">
        <Camera className="h-4 w-4 mr-1" /> Import from Image
      </Button>

      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) closeAll(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-base">Import Timetable from Image</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload a photo of your timetable and we'll help you fill it in.
            </DialogDescription>
          </DialogHeader>

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full h-20 border-dashed active-press"
                onClick={() => fileRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tap to select image</span>
                </div>
              </Button>

              {imagePreview && (
                <>
                  <img
                    src={imagePreview}
                    alt="Timetable preview"
                    className="w-full rounded-lg border border-border max-h-48 object-contain bg-muted/30"
                  />
                  <Button onClick={runOCR} className="w-full active-press">
                    <Beaker className="h-4 w-4 mr-1" /> Run OCR
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── Step: Processing ── */}
          {step === "processing" && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Scanning image…</span>
              </div>
              <Progress value={ocrProgress} className="h-2" />
              <span className="text-xs text-muted-foreground font-mono">{ocrProgress}%</span>
            </div>
          )}

          {/* ── Step: Tokens ── */}
          {step === "tokens" && (
            <div className="space-y-3">
              {ocrError ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Text could not be detected.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can still fill the timetable manually.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Detected {ocrTokens.length} tokens. Subject matches are highlighted.
                  </p>
                  <ScrollArea className="h-32 rounded-lg border border-border p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {ocrTokens.map((token, i) => {
                        const cls = classifyToken(token);
                        return (
                          <span
                            key={`${token}-${i}`}
                            className={`px-2 py-0.5 rounded-md text-xs font-mono ${
                              cls === "match"
                                ? "bg-attendance-green/20 text-attendance-green-foreground border border-attendance-green/40"
                                : cls === "ignore"
                                  ? "bg-muted text-muted-foreground line-through"
                                  : "bg-muted/50 text-foreground"
                            }`}
                          >
                            {token}
                          </span>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
              <Button onClick={() => { setStep("grid"); }} className="w-full active-press">
                Continue to Grid Editor
              </Button>
            </div>
          )}

          {/* ── Step: Grid ── */}
          {step === "grid" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Tap cells to assign subjects. {filledCount} slot{filledCount !== 1 ? "s" : ""} filled.
              </p>

              {/* Grid */}
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-[10px] border-collapse min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="p-1 text-left text-muted-foreground font-medium">Time</th>
                      {DAYS.map((d) => (
                        <th key={d} className="p-1 text-center text-muted-foreground font-medium">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEFAULT_PERIODS.map((period, pIdx) => (
                      <tr key={pIdx}>
                        <td className="p-1 text-muted-foreground font-mono whitespace-nowrap">
                          {period.start}
                        </td>
                        {DAYS.map((_, dIdx) => {
                          const cell = grid[dIdx][pIdx];
                          const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
                          return (
                            <td key={dIdx} className="p-0.5">
                              <button
                                onClick={() => setCellSelector({ day: dIdx, period: pIdx })}
                                className={`w-full min-h-[44px] rounded-lg border text-[10px] font-medium transition-colors active-press ${
                                  cell
                                    ? "bg-primary/10 border-primary/30 text-foreground"
                                    : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60"
                                }`}
                              >
                                {sub ? (
                                  <div className="flex flex-col items-center gap-0.5 p-0.5">
                                    <span className="truncate max-w-full">{sub.name}</span>
                                    {cell?.isLab && (
                                      <span className="text-[8px] bg-attendance-blue/20 text-attendance-blue-foreground px-1 rounded">
                                        LAB
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  "+"
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("tokens")} className="flex-1 active-press">
                  Back
                </Button>
                <Button
                  onClick={validateAndSave}
                  disabled={filledCount === 0}
                  className="flex-1 active-press"
                >
                  <Check className="h-4 w-4 mr-1" /> Save ({filledCount})
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cell selector sheet ── */}
      <Sheet open={cellSelector !== null} onOpenChange={(o) => { if (!o) setCellSelector(null); }}>
        <SheetContent side="bottom" className="max-h-[60vh]">
          <SheetHeader>
            <SheetTitle className="text-sm">
              {cellSelector
                ? `${DAYS[cellSelector.day]} · ${DEFAULT_PERIODS[cellSelector.period].start}–${DEFAULT_PERIODS[cellSelector.period].end}`
                : "Select Subject"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-3">
            {subjects.map((s) => {
              const currentCell = cellSelector ? grid[cellSelector.day][cellSelector.period] : null;
              const isSelected = currentCell?.subjectId === s.id && !currentCell?.isLab;
              const isSelectedLab = currentCell?.subjectId === s.id && currentCell?.isLab;
              return (
                <div key={s.id} className="flex gap-2">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="flex-1 justify-start h-11 active-press"
                    onClick={() =>
                      cellSelector &&
                      setCell(cellSelector.day, cellSelector.period, { subjectId: s.id, isLab: false })
                    }
                  >
                    {s.name}
                  </Button>
                  <Button
                    variant={isSelectedLab ? "default" : "outline"}
                    size="sm"
                    className="h-11 active-press"
                    onClick={() =>
                      cellSelector &&
                      setCell(cellSelector.day, cellSelector.period, { subjectId: s.id, isLab: true })
                    }
                  >
                    <Beaker className="h-3 w-3 mr-1" /> Lab
                  </Button>
                </div>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-11 text-destructive active-press"
              onClick={() => cellSelector && setCell(cellSelector.day, cellSelector.period, null)}
            >
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Confirm replace/merge dialog ── */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace existing timetable?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You already have {timetable.length} slot{timetable.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => doSave("replace")} variant="destructive" className="w-full active-press">
              Replace
            </Button>
            <Button onClick={() => doSave("merge")} variant="outline" className="w-full active-press">
              Merge
            </Button>
            <Button onClick={() => setConfirmDialog(false)} variant="ghost" className="w-full active-press">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
