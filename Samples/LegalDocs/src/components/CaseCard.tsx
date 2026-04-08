import { LegalCase } from "@/types/legal";
import { Folder, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaseCardProps {
  legalCase: LegalCase;
  isSelected: boolean;
  onClick: () => void;
}

export default function CaseCard({ legalCase, isSelected, onClick }: CaseCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg transition-all duration-200",
        isSelected
          ? "legal-card-selected"
          : "legal-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          isSelected ? "bg-primary" : "bg-primary/10"
        )}>
          <Folder className={cn(
            "w-5 h-5",
            isSelected ? "text-primary-foreground" : "text-primary"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-foreground truncate">
              {legalCase.name}
            </h3>
            <ChevronRight className={cn(
              "w-4 h-4 flex-shrink-0 transition-transform",
              isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(legalCase.createdDate)}</span>
          </div>
          <div className="mt-2">
            <span className={cn(
              "legal-badge",
              legalCase.status === "active" ? "legal-badge-active" : "legal-badge-pending"
            )}>
              {legalCase.status === "active" ? "Active" : "Pending"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
