import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import PageShell from "@/components/PageShell";
import Index from "./pages/Index";
import TimetablePage from "./pages/Timetable";
import SubjectsPage from "./pages/Subjects";
import CalendarPage from "./pages/Calendar";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

// ── Placeholder factory ───────────────────────────────────────────────────────
// Each settings sub-page renders this until real logic is moved in.

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
        <p className="text-sm text-muted-foreground">Coming soon — logic will be moved here.</p>
      </div>
    </PageShell>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Core pages ── */}
              <Route path="/" element={<Index />} />
              <Route path="/timetable" element={<TimetablePage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />

              {/* ── Settings ── */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/semester"      element={<SettingsPlaceholder title="Semester" />} />
              <Route path="/settings/subjects"      element={<SettingsPlaceholder title="Subjects" />} />
              <Route path="/settings/timetable"     element={<SettingsPlaceholder title="Timetable" />} />
              <Route path="/settings/holidays"      element={<SettingsPlaceholder title="Holidays" />} />
              <Route path="/settings/notifications" element={<SettingsPlaceholder title="Notifications" />} />
              <Route path="/settings/data"          element={<SettingsPlaceholder title="Data" />} />
              <Route path="/settings/appearance"    element={<SettingsPlaceholder title="Appearance" />} />
              <Route path="/settings/danger"        element={<SettingsPlaceholder title="Danger Zone" />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
