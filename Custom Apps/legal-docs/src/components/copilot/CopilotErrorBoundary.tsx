import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specifically for the Copilot SDK.
 * Catches internal SDK errors and provides a graceful fallback UI.
 */
export class CopilotErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CopilotErrorBoundary caught error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Unknown error";
      const isNameError = errorMessage.includes("Cannot read properties of undefined (reading 'name')");

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="p-4 rounded-full bg-amber-500/10 mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h4 className="font-semibold mb-2">Copilot SDK Error</h4>
          
          {isNameError ? (
            <div className="text-sm text-muted-foreground mb-4 max-w-md space-y-2">
              <p>The Copilot SDK encountered an internal error.</p>
              <p className="text-xs bg-muted p-2 rounded">
                This typically occurs when the container metadata is incomplete or the tenant configuration needs adjustment.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button variant="secondary" size="sm" onClick={this.props.onClose}>
              Close
            </Button>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            <p className="mb-2">Troubleshooting steps:</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>Verify container has documents uploaded</li>
              <li>Check CopilotEmbeddedChatHosts configuration</li>
              <li>Ensure DiscoverabilityDisabled is false</li>
            </ul>
            <a 
              href="https://learn.microsoft.com/en-us/sharepoint/dev/embedded/development/declarative-agent/spe-da-adv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-primary hover:underline"
            >
              View SDK documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
