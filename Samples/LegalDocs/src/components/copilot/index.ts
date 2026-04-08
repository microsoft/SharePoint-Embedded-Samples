// Copilot Chat Components
// Use CopilotChatContainer as the main entry point for Copilot chat
// It handles auth, config, and renders CopilotDesktopView

export { default as CopilotChatContainer } from "./CopilotChatContainer";
export { default as CustomCopilotChat } from "../CustomCopilotChat";
export { default as SDKCopilotChat } from "./SDKCopilotChat";
export { default as CopilotDesktopView } from "./CopilotDesktopView";
export { CopilotAuthProvider } from "./CopilotAuthProvider";
export { CopilotErrorBoundary } from "./CopilotErrorBoundary";
export type { IChatEmbeddedApiAuthProvider } from "./CopilotAuthProvider";
