import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import CaseAccordion from "@/components/CaseAccordion";
import CaseDetails from "@/components/CaseDetails";
import { useContainers } from "@/hooks/useContainers";
import { SharePointContainer, createContainer } from "@/services/sharepoint";
import { FolderNode } from "@/hooks/useFolders";
import { Plus, Briefcase, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FlyoutPanel from "@/components/FlyoutPanel";
import FlyoutButtons from "@/components/FlyoutButtons";
import CaseSummaryPanel from "@/components/panels/CaseSummaryPanel";
import ToolsPanel from "@/components/panels/ToolsPanel";
import ReportsPanel from "@/components/panels/ReportsPanel";
import CopilotPanel from "@/components/panels/CopilotPanel";
import { PanelType } from "@/components/FlyoutButtons";

// Button column width
const BUTTON_COLUMN_WIDTH = 48;

export default function Dashboard() {
  const { isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();
  const { containers, isLoading, error, refresh } = useContainers();
  const [selectedContainer, setSelectedContainer] = useState<SharePointContainer | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [refreshFoldersFn, setRefreshFoldersFn] = useState<(() => void) | null>(null);
  
  // Flyout panel state
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [pinnedPanels, setPinnedPanels] = useState<Set<PanelType>>(new Set());
  const [panelWidth, setPanelWidth] = useState(400);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate("/");
    }
  }, [isInitialized, isAuthenticated, navigate]);

  useEffect(() => {
    // Select first container by default
    if (containers.length > 0 && !selectedContainer) {
      setSelectedContainer(containers[0]);
    }
  }, [containers, selectedContainer]);

  const { getAccessToken } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCase = async () => {
    if (!newCaseName.trim()) return;
    
    setIsCreating(true);
    try {
      // Get access token with FileStorageContainer.Selected scope
      const token = await getAccessToken([
        "https://graph.microsoft.com/FileStorageContainer.Selected"
      ]);
      
      if (!token) {
        throw new Error("Failed to acquire access token");
      }
      
      // Create the container via Graph API
      const newContainer = await createContainer(token, newCaseName.trim());
      
      toast.success(`Case "${newCaseName}" created successfully`);
      setNewCaseName("");
      setIsCreateDialogOpen(false);
      
      // Refresh the containers list
      await refresh();
      
      // Select the newly created container
      setSelectedContainer(newContainer);
    } catch (err) {
      console.error("Error creating case:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFolderSelect = (folder: FolderNode) => {
    setSelectedFolder(folder);
  };

  const handleRefreshFolders = (refreshFn: () => void) => {
    setRefreshFoldersFn(() => refreshFn);
  };

  const triggerFolderRefresh = () => {
    if (refreshFoldersFn) {
      refreshFoldersFn();
    }
  };

  const handlePanelToggle = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handlePinToggle = (panel: PanelType) => {
    setPinnedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panel)) {
        newSet.delete(panel);
      } else {
        newSet.add(panel);
      }
      return newSet;
    });
  };

  const handlePanelClose = (panel: PanelType) => {
    setActivePanel(null);
    setPinnedPanels(prev => {
      const newSet = new Set(prev);
      newSet.delete(panel);
      return newSet;
    });
  };

  const handlePanelWidthChange = (width: number) => {
    setPanelWidth(width);
  };

  // Check if any panel is pinned to adjust layout
  const hasPinnedPanel = activePanel !== null && pinnedPanels.has(activePanel);
  
  // Calculate right margin for main content
  const mainContentMarginRight = hasPinnedPanel 
    ? panelWidth + BUTTON_COLUMN_WIDTH 
    : BUTTON_COLUMN_WIDTH;

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 flex relative">
        {/* Sidebar - Cases List */}
        <aside 
          className="w-80 border-r border-border bg-card flex flex-col transition-all duration-300"
          style={{ marginRight: 0 }}
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-foreground">Cases</h2>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8">
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Legal Case</DialogTitle>
                    <DialogDescription>
                      Enter a name for the new legal case. This will create a new secure container for all case-related documents.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="case-name">Case Name</Label>
                    <Input
                      id="case-name"
                      value={newCaseName}
                      onChange={(e) => setNewCaseName(e.target.value)}
                      placeholder="e.g., Smith vs Johnson Corp"
                      className="mt-2"
                      disabled={isCreating}
                      onKeyDown={(e) => e.key === "Enter" && !isCreating && handleCreateCase()}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCase} disabled={!newCaseName.trim() || isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Case"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {selectedContainer && (
              <p className="text-sm text-muted-foreground truncate">
                Selected: {selectedContainer.displayName}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive/50 mb-3" />
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={refresh} className="mt-3">
                  Retry
                </Button>
              </div>
            ) : containers.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No cases found</p>
                <p className="text-sm text-muted-foreground/70">Create a new case to get started</p>
              </div>
            ) : (
              containers.map((container) => (
                <CaseAccordion
                  key={container.id}
                  container={container}
                  isSelected={selectedContainer?.id === container.id}
                  onSelect={() => setSelectedContainer(container)}
                  onFolderSelect={handleFolderSelect}
                  selectedFolderId={selectedFolder?.id}
                  onRefreshFolders={selectedContainer?.id === container.id ? handleRefreshFolders : undefined}
                />
              ))
            )}
          </div>
        </aside>

        {/* Main Content - adjusts when panel is pinned */}
        <main 
          className="flex-1 overflow-hidden transition-all duration-300"
          style={{ 
            marginRight: `${mainContentMarginRight}px`
          }}
        >
          {selectedContainer ? (
            <CaseDetails 
              container={selectedContainer} 
              selectedFolder={selectedFolder}
              onFolderCreated={triggerFolderRefresh}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-xl text-muted-foreground">Select a case to view details</p>
              </div>
            </div>
          )}
        </main>

        {/* Flyout Buttons */}
        <FlyoutButtons 
          activePanel={activePanel} 
          onPanelToggle={handlePanelToggle}
          showCopilot={!!selectedContainer}
        />

        {/* Flyout Panels */}
        <FlyoutPanel
          title="Case Summary"
          isOpen={activePanel === "caseSummary"}
          onClose={() => handlePanelClose("caseSummary")}
          isPinned={pinnedPanels.has("caseSummary")}
          onPinToggle={() => handlePinToggle("caseSummary")}
          onWidthChange={handlePanelWidthChange}
        >
          <CaseSummaryPanel containerName={selectedContainer?.displayName} />
        </FlyoutPanel>

        <FlyoutPanel
          title="Tools"
          isOpen={activePanel === "tools"}
          onClose={() => handlePanelClose("tools")}
          isPinned={pinnedPanels.has("tools")}
          onPinToggle={() => handlePinToggle("tools")}
          onWidthChange={handlePanelWidthChange}
        >
          <ToolsPanel />
        </FlyoutPanel>

        <FlyoutPanel
          title="Reports"
          isOpen={activePanel === "reports"}
          onClose={() => handlePanelClose("reports")}
          isPinned={pinnedPanels.has("reports")}
          onPinToggle={() => handlePinToggle("reports")}
          onWidthChange={handlePanelWidthChange}
        >
          <ReportsPanel />
        </FlyoutPanel>

        {/* Copilot Panel */}
        {selectedContainer && (
          <FlyoutPanel
            title="AI Assistant"
            isOpen={activePanel === "copilot"}
            onClose={() => handlePanelClose("copilot")}
            isPinned={pinnedPanels.has("copilot")}
            onPinToggle={() => handlePinToggle("copilot")}
            onWidthChange={handlePanelWidthChange}
          >
            <CopilotPanel 
              containerId={selectedContainer.id}
              containerName={selectedContainer.displayName}
            />
          </FlyoutPanel>
        )}
      </div>
    </div>
  );
}
