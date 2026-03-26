import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type {
  Subject,
  TimetableSlot,
  AttendanceRecord,
  Holiday,
  ExamPeriod,
  SemesterConfig,
} from "@/types/attendance";
import {
  loadSubjects, saveSubjects,
  loadTimetable, saveTimetable,
  loadAttendanceRecords, saveAttendanceRecords,
  loadHolidays, saveHolidays,
  loadExamPeriods, saveExamPeriods,
  loadSemesterConfig, saveSemesterConfig,
  clearAllData,
} from "@/lib/storage";
import { INDIAN_HOLIDAYS } from "@/data/holidays";
import { detectUserState, getCachedUserState } from "@/lib/holidayDetection";
import { TEST_SUBJECTS, TEST_TIMETABLE, TEST_RECORDS, TEST_HOLIDAYS, TEST_EXAM_PERIODS, TEST_SEMESTER, runTestVerification } from "@/lib/testData";

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── localStorage keys ──────────────────────────────────────────────────────────
const DELETED_IDS_KEY = "deletedHolidayIds";

function loadDeletedIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveDeletedIds(ids: string[]): void {
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
}

// ── Build auto holidays from INDIAN_HOLIDAYS ───────────────────────────────────
function buildAutoHolidays(userState: string | null, deletedIds: string[]): Holiday[] {
  const deletedSet = new Set(deletedIds);
  return INDIAN_HOLIDAYS
    .filter((entry) => {
      if (deletedSet.has(entry.id)) return false;
      if (entry.states === "all") return true;
      if (!userState) return false;
      return entry.states.includes(userState);
    })
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      name: entry.name,
      type: entry.type,
    }));
}

// ── Merge auto + manual holidays, deduplicating by date ───────────────────────
// Manual holidays (by date) take precedence over auto ones.
function mergeAllHolidays(autoHolidays: Holiday[], manualHolidays: Holiday[]): Holiday[] {
  const manualDates = new Set(manualHolidays.map((h) => h.date));
  const merged = [...manualHolidays];
  for (const h of autoHolidays) {
    if (!manualDates.has(h.date)) {
      merged.push(h);
    }
  }
  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Context interface ─────────────────────────────────────────────────────────
interface AppState {
  subjects: Subject[];
  timetable: TimetableSlot[];
  records: AttendanceRecord[];
  /** Manually added holidays (user-entered) */
  holidays: Holiday[];
  /** Combined holidays (auto + manual) used by engines and pages */
  allHolidays: Holiday[];
  /** Auto-loaded holidays derived from INDIAN_HOLIDAYS, for display in Settings */
  apiHolidays: Holiday[];
  /** Detected state from IP (e.g. "Telangana"), null if detection failed */
  userState: string | null;
  /** IDs of auto holidays the user has deleted */
  deletedHolidayIds: string[];
  examPeriods: ExamPeriod[];
  semester: SemesterConfig;
  setSubjects: (s: Subject[]) => void;
  setTimetable: (t: TimetableSlot[]) => void;
  setRecords: (r: AttendanceRecord[]) => void;
  setHolidays: (h: Holiday[]) => void;
  setExamPeriods: (e: ExamPeriod[]) => void;
  setSemester: (s: SemesterConfig) => void;
  markAttendance: (subjectId: string, date: string, slotId: string, weight: number, status: AttendanceRecord["status"]) => void;
  clearMark: (subjectId: string, date: string, slotId: string) => void;
  addExtraClass: (subjectId: string, date: string, weight: number) => void;
  deleteExtraClass: (slotId: string, date: string) => void;
  /** Delete an auto-loaded holiday by its id (adds to deletedHolidayIds) */
  deleteAutoHoliday: (id: string) => void;
  /** Restore a previously deleted auto holiday */
  restoreAutoHoliday: (id: string) => void;
  resetAll: () => void;
  loadTestData: () => void;
  /** No-op kept for API compatibility while Settings UI is still being updated */
  refreshApiHolidays: () => Promise<void>;
  /** Currently viewed date, controlled by Calendar; Today reads this */
  selectedDate: string;
  setSelectedDate: (d: string) => void;
}

const defaultSemester: SemesterConfig = { startDate: "2026-01-05", endDate: "2026-05-01" };

const fallback: AppState = {
  subjects: [],
  timetable: [],
  records: [],
  holidays: [],
  allHolidays: [],
  apiHolidays: [],
  userState: null,
  deletedHolidayIds: [],
  examPeriods: [],
  semester: defaultSemester,
  setSubjects: () => {},
  setTimetable: () => {},
  setRecords: () => {},
  setHolidays: () => {},
  setExamPeriods: () => {},
  setSemester: () => {},
  markAttendance: () => {},
  clearMark: () => {},
  addExtraClass: () => {},
  deleteExtraClass: () => {},
  deleteAutoHoliday: () => {},
  restoreAutoHoliday: () => {},
  resetAll: () => {},
  loadTestData: () => {},
  refreshApiHolidays: async () => {},
  selectedDate: getTodayStr(),
  setSelectedDate: () => {},
};

const AppContext = createContext<AppState>(fallback);

export function useAppState() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [subjects, _setSubjects] = useState<Subject[]>(loadSubjects);
  const [timetable, _setTimetable] = useState<TimetableSlot[]>(loadTimetable);
  const [records, _setRecords] = useState<AttendanceRecord[]>(loadAttendanceRecords);
  const [holidays, _setHolidays] = useState<Holiday[]>(loadHolidays);
  const [examPeriods, _setExamPeriods] = useState<ExamPeriod[]>(loadExamPeriods);
  const [semester, _setSemester] = useState<SemesterConfig>(loadSemesterConfig);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // ── IP-based state detection ────────────────────────────────────────────────
  // Initialise from cache immediately (sync) so first render has the value.
  const [userState, setUserState] = useState<string | null>(() => getCachedUserState());
  const [deletedHolidayIds, _setDeletedHolidayIds] = useState<string[]>(loadDeletedIds);

  useEffect(() => {
    // If we already have a cached state, no network call needed.
    if (userState) return;
    detectUserState().then((state) => {
      if (state) setUserState(state);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto holidays derived from INDIAN_HOLIDAYS ──────────────────────────────
  const apiHolidays = useMemo(
    () => buildAutoHolidays(userState, deletedHolidayIds),
    [userState, deletedHolidayIds]
  );

  // ── Merged holiday list consumed by the rest of the app ────────────────────
  const allHolidays = useMemo(
    () => mergeAllHolidays(apiHolidays, holidays),
    [apiHolidays, holidays]
  );

  // ── Setters ────────────────────────────────────────────────────────────────
  const setDeletedIds = useCallback((ids: string[]) => {
    _setDeletedHolidayIds(ids);
    saveDeletedIds(ids);
  }, []);

  const setSubjects = useCallback((s: Subject[]) => { _setSubjects(s); saveSubjects(s); }, []);
  const setTimetable = useCallback((t: TimetableSlot[]) => { _setTimetable(t); saveTimetable(t); }, []);
  const setRecords = useCallback((r: AttendanceRecord[]) => { _setRecords(r); saveAttendanceRecords(r); }, []);
  const setHolidays = useCallback((h: Holiday[]) => { _setHolidays(h); saveHolidays(h); }, []);
  const setExamPeriods = useCallback((e: ExamPeriod[]) => { _setExamPeriods(e); saveExamPeriods(e); }, []);
  const setSemester = useCallback((s: SemesterConfig) => { _setSemester(s); saveSemesterConfig(s); }, []);

  const deleteAutoHoliday = useCallback((id: string) => {
    _setDeletedHolidayIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveDeletedIds(next);
      return next;
    });
  }, []);

  const restoreAutoHoliday = useCallback((id: string) => {
    _setDeletedHolidayIds((prev) => {
      const next = prev.filter((x) => x !== id);
      saveDeletedIds(next);
      return next;
    });
  }, []);

  const markAttendance = useCallback((subjectId: string, date: string, slotId: string, weight: number, status: AttendanceRecord["status"]) => {
    _setRecords((prev) => {
      const existing = prev.findIndex((r) => r.subjectId === subjectId && r.date === date && r.slotId === slotId);
      let next: AttendanceRecord[];
      if (existing >= 0) {
        next = [...prev];
        next[existing] = { ...next[existing], status, weightSnapshot: weight };
      } else {
        next = [...prev, { id: `${subjectId}-${date}-${slotId}`, subjectId, date, status, weightSnapshot: weight, slotId }];
      }
      saveAttendanceRecords(next);
      return next;
    });
  }, []);

  const clearMark = useCallback((subjectId: string, date: string, slotId: string) => {
    _setRecords((prev) => {
      const next = prev.filter((r) => !(r.subjectId === subjectId && r.date === date && r.slotId === slotId));
      saveAttendanceRecords(next);
      return next;
    });
  }, []);

  const addExtraClass = useCallback((subjectId: string, date: string, weight: number) => {
    const slotId = `extra-${subjectId}-${date}-${Date.now()}`;
    _setRecords((prev) => {
      const next = [...prev, { id: slotId, subjectId, date, status: "PRESENT" as const, weightSnapshot: weight, slotId, isExtra: true }];
      saveAttendanceRecords(next);
      return next;
    });
  }, []);

  const deleteExtraClass = useCallback((slotId: string, date: string) => {
    _setRecords((prev) => {
      const next = prev.filter((r) => !(r.slotId === slotId && r.date === date && r.isExtra));
      saveAttendanceRecords(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    clearAllData();
    localStorage.removeItem(DELETED_IDS_KEY);
    _setSubjects([]);
    _setTimetable([]);
    _setRecords([]);
    _setHolidays([]);
    _setExamPeriods([]);
    _setSemester(loadSemesterConfig());
    _setDeletedHolidayIds([]);
  }, []);

  const loadTestData = useCallback(() => {
    setSubjects(TEST_SUBJECTS);
    setTimetable(TEST_TIMETABLE);
    setRecords(TEST_RECORDS);
    setHolidays(TEST_HOLIDAYS);
    setExamPeriods(TEST_EXAM_PERIODS);
    setSemester(TEST_SEMESTER);
    runTestVerification();
  }, [setSubjects, setTimetable, setRecords, setHolidays, setExamPeriods, setSemester]);

  const refreshApiHolidays = useCallback(async () => {
    // No-op: holidays now come from the bundled INDIAN_HOLIDAYS data, not a network API.
  }, []);

  return (
    <AppContext.Provider value={{
      subjects, timetable, records, holidays, allHolidays, apiHolidays,
      userState, deletedHolidayIds,
      examPeriods, semester,
      setSubjects, setTimetable, setRecords, setHolidays, setExamPeriods, setSemester,
      markAttendance, clearMark, addExtraClass, deleteExtraClass,
      deleteAutoHoliday, restoreAutoHoliday,
      resetAll, loadTestData, refreshApiHolidays,
      selectedDate, setSelectedDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}
