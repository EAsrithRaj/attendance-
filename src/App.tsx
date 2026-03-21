import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import PageShell from "@/components/PageShell";
import SettingsAppearance from "./pages/settings/SettingsAppearance";
import Index from "./pages/Index";
import TimetablePage from "./pages/Timetable";
import SubjectsPage from "./pages/Subjects";
import CalendarPage from "./pages/Calendar";
import SettingsPage from "./pages/Settings";
import SettingsExams from "./pages/settings/SettingsExams";
import SettingsHolidays from "./pages/settings/SettingsHolidays";
import SettingsSemester from "./pages/settings/SettingsSemester";
import SettingsSubjects from "./pages/settings/SettingsSubjects";
import SettingsTimetable from "./pages/settings/SettingsTimetable";
import SettingsNotifications from "./pages/settings/SettingsNotifications";
import SettingsData from "./pages/settings/SettingsData";

import NotFound from "./pages/NotFound";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

function SettingsPlaceholder({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <PageShell
      title={title}
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
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
        <div className="rounded-2xl bg-muted p-5">
          <span className="text-4xl">🚧</span>
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">
          Coming soon — logic will be moved here.
        </p>
      </div>
    </PageShell>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/timetable" element={<TimetablePage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />

              <Route path="/settings" element={<SettingsPage />} />

              <Route path="/settings/semester" element={<SettingsSemester />} />

              {/* FIXED SUBJECTS */}
              <Route
                path="/settings/subjects"
                element={<SettingsSubjects />}
              />

              <Route path="/settings/timetable" element={<SettingsTimetable />} />
              <Route path="/settings/notifications" element={<SettingsNotifications />} />

              <Route
                path="/settings/holidays"
                element={<SettingsHolidays />}
              />
              <Route
                path="/settings/exams"
                element={<SettingsExams />}
              />
              <Route path="/settings/data" element={<SettingsData />} />
              <Route
                path="/settings/appearance"
                element={<SettingsAppearance />}
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;