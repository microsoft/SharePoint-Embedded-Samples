import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export type PanelType = "caseSummary" | "tools" | "reports" | "copilot";

interface FlyoutButtonsProps {
  activePanel: PanelType | null;
  onPanelToggle: (panel: PanelType) => void;
  showCopilot?: boolean;
}

export default function FlyoutButtons({ activePanel, onPanelToggle, showCopilot }: FlyoutButtonsProps) {
  const buttons: { id: PanelType; label: string; bgClass: string }[] = [
    { id: "caseSummary", label: "Case Summary", bgClass: "bg-primary hover:bg-primary/90" },
    ...(showCopilot ? [{ 
      id: "copilot" as PanelType, 
      label: "AI Assistant", 
      bgClass: "bg-primary/80 hover:bg-primary/70"
    }] : []),
    { id: "tools", label: "Tools", bgClass: "bg-primary/60 hover:bg-primary/50" },
    { id: "reports", label: "Reports", bgClass: "bg-primary/40 hover:bg-primary/30" },
  ];

  return (
    <div className="fixed right-0 top-14 z-50 flex flex-col gap-2 pr-0 pt-2">
      {buttons.map((button) => (
        <button
          key={button.id}
          data-flyout-trigger
          onClick={() => onPanelToggle(button.id)}
          className={cn(
            "group flex items-center gap-2 px-3 py-4 rounded-l-lg text-primary-foreground font-medium text-sm transition-all duration-200 shadow-lg",
            button.bgClass,
            activePanel === button.id && "pr-4"
          )}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <ChevronLeft 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              activePanel === button.id ? "rotate-180" : "rotate-0"
            )} 
          />
          <span className="tracking-wide">{button.label}</span>
        </button>
      ))}
    </div>
  );
}
