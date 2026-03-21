import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function SettingsAppearance() {
  const navigate = useNavigate();

  return (
    <PageShell
      title="Appearance"
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
      <div className="space-y-4 pb-20 animate-fade-in">
        <Section title="Theme">
          <ThemeToggle />
        </Section>
      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md hover:shadow-lg transition-all duration-200">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
