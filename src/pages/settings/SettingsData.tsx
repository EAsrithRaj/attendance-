import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import ImportExport from "@/components/ImportExport";

export default function SettingsData() {
  const navigate = useNavigate();

  return (
    <PageShell
      title="Data"
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
      <div className="pb-20 animate-fade-in">
        <ImportExport />
      </div>
    </PageShell>
  );
}
