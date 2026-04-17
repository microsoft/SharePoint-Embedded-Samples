import { useState, useRef, useEffect, ReactNode } from "react";
import { Pin, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FlyoutPanelProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onPinToggle: () => void;
  onWidthChange?: (width: number) => void;
  children: ReactNode;
  className?: string;
}

export default function FlyoutPanel({
  title,
  isOpen,
  onClose,
  isPinned,
  onPinToggle,
  onWidthChange,
  children,
  className
}: FlyoutPanelProps) {
  const [width, setWidth] = useState(400);
  const panelRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const minWidth = 300;
  const maxWidth = window.innerWidth * 0.6;

  // Notify parent of width changes
  useEffect(() => {
    if (isOpen && onWidthChange) {
      onWidthChange(width);
    }
  }, [width, isOpen, onWidthChange]);

  // Handle click outside to close (only if not pinned)
  useEffect(() => {
    if (!isOpen || isPinned) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Check if click is on the flyout buttons
        const target = event.target as HTMLElement;
        if (target.closest('[data-flyout-trigger]')) return;
        onClose();
      }
    };

    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isPinned, onClose]);

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, minWidth), maxWidth);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (!isOpen) return null;

  // Button column width is approximately 48px
  const buttonColumnWidth = 48;

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed top-14 h-[calc(100vh-56px)] bg-background border-l shadow-xl z-40 flex flex-col animate-slide-in-right",
        className
      )}
      style={{ 
        width: `${width}px`,
        right: `${buttonColumnWidth}px`
      }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-primary/20 active:bg-primary/30 flex items-center justify-center group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-0 w-3 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Header - aligned with bottom of blue header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isPinned && "text-primary bg-primary/10"
            )}
            onClick={onPinToggle}
            title={isPinned ? "Unpin panel" : "Pin panel"}
          >
            <Pin className={cn("h-4 w-4", isPinned && "fill-current")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - allows children to manage their own padding/overflow */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
