import { useAppState } from "@/context/AppContext";
import { useRef, useState } from "react";
import type {
  Subject,
  TimetableSlot,
  AttendanceRecord,
  Holiday,
  ExamPeriod,
  SemesterConfig,
} from "@/types/attendance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

const BACKUP_VERSION = 1;

interface BackupPayload {
  version: number;
  exportedAt: string;
  subjects: Subject[];
  timetable: TimetableSlot[];
  records: AttendanceRecord[];
  holidays: Holiday[];
  examPeriods: ExamPeriod[];
  semester: SemesterConfig;
}

type CsvType =
  | "subjects"
  | "timetable"
  | "records"
  | "holidays"
  | "examPeriods";

// ── CSV helpers ───────────────────────────────────────────────────────────────

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes("\n") || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ",") {
          cells.push(cell);
          cell = "";
        } else {
          cell += ch;
        }
      }
    }
    cells.push(cell);
    rows.push(cells);
  }
  return rows;
}

// ── Download helper ───────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Export functions ──────────────────────────────────────────────────────────

function exportJson(payload: BackupPayload) {
  downloadBlob(
    JSON.stringify(payload, null, 2),
    `attendance-backup-${todayStr()}.json`,
    "application/json",
  );
}

function exportSubjectsCsv(subjects: Subject[]) {
  const rows = [
    ["id", "name", "minimumRequiredPercentage"],
    ...subjects.map((s) => [s.id, s.name, String(s.minimumRequiredPercentage)]),
  ];
  downloadBlob(toCsv(rows), `subjects-${todayStr()}.csv`, "text/csv");
}

function exportTimetableCsv(timetable: TimetableSlot[]) {
  const rows = [
    ["id", "subjectId", "dayOfWeek", "startTime", "endTime", "weight"],
    ...timetable.map((s) => [
      s.id,
      s.subjectId,
      String(s.dayOfWeek),
      s.startTime,
      s.endTime,
      String(s.weight),
    ]),
  ];
  downloadBlob(toCsv(rows), `timetable-${todayStr()}.csv`, "text/csv");
}

function exportRecordsCsv(records: AttendanceRecord[]) {
  const rows = [
    [
      "id",
      "subjectId",
      "date",
      "status",
      "weightSnapshot",
      "slotId",
      "isExtra",
    ],
    ...records.map((r) => [
      r.id,
      r.subjectId,
      r.date,
      r.status,
      String(r.weightSnapshot),
      r.slotId,
      String(r.isExtra ?? false),
    ]),
  ];
  downloadBlob(toCsv(rows), `attendance-records-${todayStr()}.csv`, "text/csv");
}

function exportHolidaysCsv(holidays: Holiday[]) {
  const rows = [
    ["date", "name", "type"],
    ...holidays.map((h) => [h.date, h.name ?? "", h.type ?? "manual"]),
  ];
  downloadBlob(toCsv(rows), `holidays-${todayStr()}.csv`, "text/csv");
}

function exportExamPeriodsCsv(examPeriods: ExamPeriod[]) {
  const rows = [
    ["startDate", "endDate"],
    ...examPeriods.map((ep) => [ep.startDate, ep.endDate]),
  ];
  downloadBlob(toCsv(rows), `exam-periods-${todayStr()}.csv`, "text/csv");
}

// ── Import parsers ────────────────────────────────────────────────────────────

function parseSubjectsCsv(text: string): Subject[] {
  const [header, ...rows] = parseCsvRows(text);
  const idx = (col: string) => header.indexOf(col);
  return rows
    .filter((r) => r[idx("id")]?.trim())
    .map((r) => ({
      id: r[idx("id")].trim(),
      name: r[idx("name")]?.trim() || r[idx("id")].trim(),
      minimumRequiredPercentage:
        Number(r[idx("minimumRequiredPercentage")]) || 75,
    }));
}

function parseTimetableCsv(text: string): TimetableSlot[] {
  const [header, ...rows] = parseCsvRows(text);
  const idx = (col: string) => header.indexOf(col);
  return rows
    .filter((r) => r[idx("id")]?.trim())
    .map((r) => ({
      id: r[idx("id")].trim(),
      subjectId: r[idx("subjectId")]?.trim() || "",
      dayOfWeek: Number(r[idx("dayOfWeek")]) || 1,
      startTime: r[idx("startTime")]?.trim() || "09:00",
      endTime: r[idx("endTime")]?.trim() || "10:00",
      weight: Number(r[idx("weight")]) || 1,
    }));
}

function parseRecordsCsv(text: string): AttendanceRecord[] {
  const [header, ...rows] = parseCsvRows(text);
  const idx = (col: string) => header.indexOf(col);
  const validStatus = new Set(["PRESENT", "ABSENT", "CANCELLED"]);
  return rows
    .filter((r) => r[idx("id")]?.trim())
    .map((r) => ({
      id: r[idx("id")].trim(),
      subjectId: r[idx("subjectId")]?.trim() || "",
      date: r[idx("date")]?.trim() || "",
      status: (validStatus.has(r[idx("status")]?.trim())
        ? r[idx("status")].trim()
        : "ABSENT") as AttendanceRecord["status"],
      weightSnapshot: Number(r[idx("weightSnapshot")]) || 1,
      slotId: r[idx("slotId")]?.trim() || "",
      isExtra: r[idx("isExtra")]?.trim() === "true",
    }));
}

function parseHolidaysCsv(text: string): Holiday[] {
  const [header, ...rows] = parseCsvRows(text);
  const idx = (col: string) => header.indexOf(col);
  return rows
    .filter((r) => r[idx("date")]?.trim())
    .map((r) => ({
      id: `manual_${r[idx("date")].trim()}_${Date.now()}`,
      date: r[idx("date")].trim(),
      name: r[idx("name")]?.trim() || undefined,
      type: "manual" as const,
    }));
}

function parseExamPeriodsCsv(text: string): ExamPeriod[] {
  const [header, ...rows] = parseCsvRows(text);
  const idx = (col: string) => header.indexOf(col);
  return rows
    .filter((r) => r[idx("startDate")]?.trim())
    .map((r) => ({
      startDate: r[idx("startDate")].trim(),
      endDate: r[idx("endDate")]?.trim() || r[idx("startDate")].trim(),
    }));
}

// ── JSON validation ───────────────────────────────────────────────────────────

function validateBackup(obj: unknown): BackupPayload {
  if (!obj || typeof obj !== "object") throw new Error("Invalid file format");
  const o = obj as Record<string, unknown>;
  if (o.version !== BACKUP_VERSION)
    throw new Error(`Unsupported backup version: ${o.version}`);
  if (!Array.isArray(o.subjects)) throw new Error("Missing subjects");
  if (!Array.isArray(o.timetable)) throw new Error("Missing timetable");
  if (!Array.isArray(o.records)) throw new Error("Missing records");
  return o as BackupPayload;
}

// ── Component ─────────────────────────────────────────────────────────────────

type ImportMode = "json" | "csv";

interface ImportPreview {
  mode: ImportMode;
  csvType?: CsvType;
  payload?: BackupPayload;
  csvData?: { type: CsvType; items: unknown[] };
  summary: string;
}

export default function ImportExport() {
  const {
    subjects,
    timetable,
    records,
    holidays,
    examPeriods,
    semester,
    setSubjects,
    setTimetable,
    setRecords,
    setHolidays,
    setExamPeriods,
    setSemester,
  } = useAppState();

  const { resetAll, loadTestData } = useAppState();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvImportType, setCsvImportType] = useState<CsvType>("records");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const handleExportJson = () => {
    exportJson({
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      subjects,
      timetable,
      records,
      holidays,
      examPeriods,
      semester,
    });
    toast.success("JSON backup downloaded");
  };

  const handleExportCsv = (type: CsvType) => {
    switch (type) {
      case "subjects":
        exportSubjectsCsv(subjects);
        break;
      case "timetable":
        exportTimetableCsv(timetable);
        break;
      case "records":
        exportRecordsCsv(records);
        break;
      case "holidays":
        exportHolidaysCsv(holidays);
        break;
      case "examPeriods":
        exportExamPeriodsCsv(examPeriods);
        break;
    }
    toast.success(`${CSV_LABELS[type]} CSV downloaded`);
  };

  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string);
        const payload = validateBackup(obj);
        setPreview({
          mode: "json",
          payload,
          summary: [
            `📋 ${payload.subjects.length} subjects`,
            `📅 ${payload.timetable.length} timetable slots`,
            `✅ ${payload.records.length} attendance records`,
          ].join("\n"),
        });
      } catch {
        toast.error("Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!preview) return;

    if (preview.mode === "json" && preview.payload) {
      const p = preview.payload;
      setSubjects(p.subjects);
      setTimetable(p.timetable);
      setRecords(p.records);
      setHolidays(p.holidays);
      setExamPeriods(p.examPeriods);
      setSemester(p.semester);
      toast.success("Backup restored");
    }

    setPreview(null);
  };

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold">Export</p>

        <Button onClick={handleExportJson} className="w-full">
          Export JSON
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold">Import</p>

        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleJsonFile}
        />

        <Button onClick={() => jsonInputRef.current?.click()} className="w-full">
          Import JSON
        </Button>
      </div>

      {/* ✅ Danger Zone */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold text-destructive">
          Danger Zone
        </h2>

        <Button
          variant="outline"
          onClick={loadTestData}
          className="w-full"
        >
          Load Test Data
        </Button>

        <Button
          variant="destructive"
          onClick={resetAll}
          className="w-full"
        >
          Reset All Data
        </Button>
      </div>

      <Dialog open={preview !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
          </DialogHeader>

          <pre>{preview?.summary}</pre>

          <DialogFooter>
            <Button onClick={() => setPreview(null)}>Cancel</Button>
            <Button onClick={confirmImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const CSV_LABELS: Record<CsvType, string> = {
  subjects: "Subjects",
  timetable: "Timetable",
  records: "Attendance Records",
  holidays: "Holidays",
  examPeriods: "Exam Periods",
};