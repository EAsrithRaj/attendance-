import { useRef, useState } from "react";
import { useAppState } from "@/context/AppContext";
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
          // Quote if contains comma, newline, or double-quote
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

// ── JSON validation ────────────────────────────────────────── ��────────────────

function validateBackup(obj: unknown): BackupPayload {
  if (!obj || typeof obj !== "object") throw new Error("Invalid file format");
  const o = obj as Record<string, unknown>;
  if (o.version !== BACKUP_VERSION)
    throw new Error(`Unsupported backup version: ${o.version}`);
  if (!Array.isArray(o.subjects)) throw new Error("Missing subjects");
  if (!Array.isArray(o.timetable)) throw new Error("Missing timetable");
  if (!Array.isArray(o.records)) throw new Error("Missing records");
  return o as unknown as BackupPayload;
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

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvImportType, setCsvImportType] = useState<CsvType>("records");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  // ── Exports ─────────────────────────────────────────────────────────────────

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

  // ── Imports ─────────────────────────────────────────────────────────────────

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
            `🎌 ${(payload.holidays ?? []).length} manual holidays`,
            `📝 ${(payload.examPeriods ?? []).length} exam periods`,
            payload.exportedAt
              ? `Backed up: ${new Date(payload.exportedAt).toLocaleDateString()}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } catch (err) {
        toast.error(
          `Invalid backup: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      }
    };
    reader.readAsText(file);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        let items: unknown[] = [];
        switch (csvImportType) {
          case "subjects":
            items = parseSubjectsCsv(text);
            break;
          case "timetable":
            items = parseTimetableCsv(text);
            break;
          case "records":
            items = parseRecordsCsv(text);
            break;
          case "holidays":
            items = parseHolidaysCsv(text);
            break;
          case "examPeriods":
            items = parseExamPeriodsCsv(text);
            break;
        }
        if (items.length === 0) {
          toast.error("No valid rows found in CSV");
          return;
        }
        setPreview({
          mode: "csv",
          csvType: csvImportType,
          csvData: { type: csvImportType, items },
          summary: `Import ${items.length} ${CSV_LABELS[csvImportType].toLowerCase()} from CSV.\n\nThis will be MERGED with your existing data (duplicates by ID/date replaced).`,
        });
      } catch (err) {
        toast.error(
          `CSV parse error: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!preview) return;

    if (preview.mode === "json" && preview.payload) {
      const p = preview.payload;
      if (p.subjects) setSubjects(p.subjects);
      if (p.timetable) setTimetable(p.timetable);
      if (p.records) setRecords(p.records);
      if (p.holidays) setHolidays(p.holidays);
      if (p.examPeriods) setExamPeriods(p.examPeriods);
      if (p.semester) setSemester(p.semester);
      toast.success("Backup restored successfully");
    }

    if (preview.mode === "csv" && preview.csvData) {
      const { type, items } = preview.csvData;
      switch (type) {
        case "subjects": {
          const incoming = items as Subject[];
          const merged = [...subjects];
          for (const s of incoming) {
            const idx = merged.findIndex((x) => x.id === s.id);
            if (idx >= 0) merged[idx] = s;
            else merged.push(s);
          }
          setSubjects(merged);
          break;
        }
        case "timetable": {
          const incoming = items as TimetableSlot[];
          const merged = [...timetable];
          for (const s of incoming) {
            const idx = merged.findIndex((x) => x.id === s.id);
            if (idx >= 0) merged[idx] = s;
            else merged.push(s);
          }
          setTimetable(merged);
          break;
        }
        case "records": {
          const incoming = items as AttendanceRecord[];
          const merged = [...records];
          for (const r of incoming) {
            const idx = merged.findIndex((x) => x.id === r.id);
            if (idx >= 0) merged[idx] = r;
            else merged.push(r);
          }
          setRecords(merged);
          break;
        }
        case "holidays": {
          const incoming = items as Holiday[];
          const existingDates = new Set(holidays.map((h) => h.date));
          const newOnes = incoming.filter((h) => !existingDates.has(h.date));
          setHolidays([...holidays, ...newOnes]);
          break;
        }
        case "examPeriods": {
          const incoming = items as ExamPeriod[];
          // Replace exam periods entirely — no natural unique key
          setExamPeriods(incoming);
          break;
        }
      }
      toast.success(`${CSV_LABELS[type]} imported successfully`);
    }

    setPreview(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Export ───────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Export
        </p>

        {/* JSON full backup */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleExportJson}
        >
          <FileJson className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 text-left">
            <span className="font-medium">Full JSON Backup</span>
            <span className="block text-xs text-muted-foreground">
              All data — subjects, timetable, records, holidays
            </span>
          </span>
          <Download className="h-4 w-4 text-muted-foreground" />
        </Button>

        {/* CSV exports */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export individual CSVs
          </p>
          {(Object.entries(CSV_LABELS) as [CsvType, string][]).map(
            ([type, label]) => (
              <button
                key={type}
                onClick={() => handleExportCsv(type)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <span className="text-card-foreground">{label}</span>
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ),
          )}
        </div>
      </div>

      {/* ── Import ───────────────────────────────────── */}
      <div className="space-y-3 mt-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Import
        </p>

        {/* JSON import */}
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleJsonFile}
        />
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => jsonInputRef.current?.click()}
        >
          <FileJson className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 text-left">
            <span className="font-medium">Restore JSON Backup</span>
            <span className="block text-xs text-muted-foreground">
              Replaces all data from a backup file
            </span>
          </span>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </Button>

        {/* CSV import */}
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleCsvFile}
        />
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import from CSV
          </p>
          <div className="flex gap-2">
            <Select
              value={csvImportType}
              onValueChange={(v) => setCsvImportType(v as CsvType)}
            >
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CSV_LABELS) as [CsvType, string][]).map(
                  ([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => csvInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Choose file
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {CSV_HINTS[csvImportType]}
          </p>
        </div>
      </div>

      {/* ── Confirmation dialog ───────────────────────── */}
      <Dialog
        open={preview !== null}
        onOpenChange={(o) => {
          if (!o) setPreview(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Confirm Import
            </DialogTitle>
          </DialogHeader>

          {preview?.mode === "json" && (
            <p className="text-xs text-destructive font-medium bg-destructive/10 rounded-lg px-3 py-2">
              ⚠️ This will REPLACE all existing data.
            </p>
          )}

          <pre className="text-sm text-card-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/50 rounded-lg px-3 py-2">
            {preview?.summary}
          </pre>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button
              variant={preview?.mode === "json" ? "destructive" : "default"}
              onClick={confirmImport}
            >
              {preview?.mode === "json" ? "Replace & Restore" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CSV_LABELS: Record<CsvType, string> = {
  subjects: "Subjects",
  timetable: "Timetable",
  records: "Attendance Records",
  holidays: "Holidays",
  examPeriods: "Exam Periods",
};

const CSV_HINTS: Record<CsvType, string> = {
  subjects: "Columns: id, name, minimumRequiredPercentage",
  timetable: "Columns: id, subjectId, dayOfWeek, startTime, endTime, weight",
  records:
    "Columns: id, subjectId, date, status, weightSnapshot, slotId, isExtra",
  holidays: "Columns: date, name, type — merged with existing holidays",
  examPeriods:
    "Columns: startDate, endDate — replaces all existing exam periods",
};
