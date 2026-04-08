import { CopilotChatContainer } from "@/components/copilot";
import { CopilotErrorBoundary } from "@/components/copilot";

interface CopilotPanelProps {
  containerId: string;
  containerName: string;
}

/**
 * CopilotPanel - Wrapper component for the SharePoint Embedded Copilot chat
 * Uses CopilotChatContainer which handles authentication, configuration, and rendering
 */
export default function CopilotPanel({ containerId, containerName }: CopilotPanelProps) {
  return (
    <div className="h-full w-full">
      <CopilotErrorBoundary>
        <CopilotChatContainer 
          containerId={containerId} 
          containerName={containerName}
        />
      </CopilotErrorBoundary>
    </div>
  );
}
