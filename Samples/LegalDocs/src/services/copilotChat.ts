import { 
  SHAREPOINT_CONFIG, 
  GRAPH_ENDPOINT, 
  GRAPH_BETA_ENDPOINT,
  COPILOT_SCOPES,
  GRAPH_SEARCH_SCOPES,
  SHAREPOINT_CONTAINER_SCOPES,
  IChatEmbeddedApiAuthProvider, 
  ChatLaunchConfig 
} from "@/config/sharepoint";

export type { ChatLaunchConfig };

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Response type with optional citations
export interface CopilotResponse {
  content: string;
  citations?: Array<{
    documentName: string;
    webUrl: string;
    snippet?: string;
  }>;
}

// Default launch configuration following SDK patterns
export const DEFAULT_CHAT_CONFIG: ChatLaunchConfig = {
  header: "Case Assistant",
  zeroQueryPrompts: {
    headerText: "How can I help you with this case?",
    promptSuggestionList: [
      { suggestionText: "Summarize the key facts of this case" },
      { suggestionText: "Who are the parties involved?" },
      { suggestionText: "What are the important dates?" },
      { suggestionText: "List the key documents" },
    ],
  },
  suggestedPrompts: [
    "What are the main legal issues?",
    "Summarize the evidence",
    "What is the current status?",
  ],
  instruction: "You are a legal case assistant. Provide clear, professional responses based on the case documents.",
  locale: "en",
};

// Clean up text from Copilot API responses
function cleanCopilotText(text: string): string {
  let cleaned = text;
  // Remove page markers
  cleaned = cleaned.replace(/<page_\d+>/g, '').replace(/<\/page_\d+>/g, '');
  // Remove escaped markdown characters
  cleaned = cleaned.replace(/\\_/g, '_').replace(/\\-/g, '-');
  cleaned = cleaned.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  cleaned = cleaned.replace(/\\\(/g, '(').replace(/\\\)/g, ')');
  cleaned = cleaned.replace(/\\\*/g, '*');
  // Remove standalone asterisks used as separators
  cleaned = cleaned.replace(/(\s*\*\s*){2,}/g, ' ');
  // Remove single asterisks at word boundaries
  cleaned = cleaned.replace(/\*+/g, '');
  // Remove backslashes before common characters
  cleaned = cleaned.replace(/\\([^\\])/g, '$1');
  // Clean up whitespace
  cleaned = cleaned.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Create auth provider for Copilot chat.
 * 
 * IMPORTANT: The Graph API endpoints require Graph tokens (audience: graph.microsoft.com),
 * while the official SharePoint Embedded SDK requires Container.Selected scope.
 * 
 * Since we're calling Graph API endpoints directly (not using the SDK),
 * we must use Graph scopes for the token audience to be correct.
 */
export function createChatAuthProvider(
  getToken: (scopes: string[]) => Promise<string | null>
): IChatEmbeddedApiAuthProvider {
  return {
    hostname: SHAREPOINT_CONFIG.SHAREPOINT_HOSTNAME,
    getToken: async () => {
      // Use Graph scopes since we're calling Graph API endpoints directly
      // The beta/copilot/retrieval endpoint requires Graph token audience
      const token = await getToken(GRAPH_SEARCH_SCOPES);
      if (!token) {
        throw new Error("Failed to acquire token for Copilot chat");
      }
      console.log("Acquired Graph token for Copilot chat");
      return token;
    },
  };
}

/**
 * Send a message to Copilot using the beta Copilot retrieval API.
 * Falls back to Graph Search if the beta API is not available.
 */
export async function sendCopilotMessage(
  authProvider: IChatEmbeddedApiAuthProvider,
  containerId: string,
  containerName: string,
  userMessage: string,
  conversationHistory: CopilotMessage[],
  config: ChatLaunchConfig = DEFAULT_CHAT_CONFIG
): Promise<string> {
  const accessToken = await authProvider.getToken();

  // Build conversation context for the Copilot API
  const contextMessages = conversationHistory
    .slice(-6)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  const systemInstruction = config.instruction || DEFAULT_CHAT_CONFIG.instruction;

  // Try the beta Copilot retrieval API first (may not be available for all tenants)
  const copilotResponse = await callCopilotRetrievalAPI(
    accessToken,
    containerId,
    containerName,
    userMessage,
    contextMessages,
    systemInstruction
  );
  
  if (copilotResponse) {
    return copilotResponse;
  }

  // Fallback to drive search when Copilot API is unavailable
  console.log("Copilot API unavailable, using drive search fallback");
  return await searchBasedResponse(accessToken, containerId, containerName, userMessage, config);
}

/**
 * Call the Microsoft Graph beta Copilot retrieval API.
 * This provides AI-generated responses grounded in container documents.
 */
async function callCopilotRetrievalAPI(
  accessToken: string,
  containerId: string,
  containerName: string,
  userMessage: string,
  contextMessages: Array<{ role: string; content: string }>,
  systemInstruction: string
): Promise<string | null> {
  const copilotUrl = `${GRAPH_BETA_ENDPOINT}/copilot/retrieval`;

  const requestBody = {
    requests: [
      {
        entityTypes: ["driveItem"],
        contentSources: [`/drives/${containerId}`],
        query: {
          queryString: userMessage,
        },
        groundingOptions: {
          systemPrompt: systemInstruction,
          conversationContext: contextMessages,
        },
      },
    ],
  };

  const response = await fetch(copilotUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // 400/401/403 are expected when beta Copilot API is not enabled for the tenant
    // Only log as warning, not error, to avoid console noise
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      console.warn("Copilot retrieval API not available (expected for tenants without Copilot preview)");
    } else {
      const errorText = await response.text();
      console.error("Copilot retrieval API error:", response.status, errorText);
    }
    return null;
  }

  const data = await response.json();
  
  // Extract response content from the Copilot API response
  const responseContent = data.value?.response || data.value?.[0]?.response;
  
  if (responseContent) {
    return cleanCopilotText(responseContent);
  }

  // Check for any other response format
  if (data.value?.content) {
    return cleanCopilotText(data.value.content);
  }

  return null;
}

/**
 * Search-based response using Graph Search API.
 * Scoped to the specific container (drive) to only search documents in the selected case.
 */
async function searchBasedResponse(
  accessToken: string,
  containerId: string,
  containerName: string,
  userMessage: string,
  config: ChatLaunchConfig
): Promise<string> {
  // Use drive-specific search endpoint directly for SharePoint Embedded containers
  // This is more reliable than the /search/query endpoint for container-scoped searches
  return await searchWithDriveFilter(accessToken, containerId, containerName, userMessage);
}

/**
 * Alternative search approach: directly query the container's drive for content.
 */
async function searchWithDriveFilter(
  accessToken: string,
  containerId: string,
  containerName: string,
  userMessage: string
): Promise<string> {
  // Sanitize the query - remove special characters that cause URL issues
  const sanitizedQuery = userMessage
    .replace(/[?&=#%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Use the drive's children endpoint with filter for broader content listing
  // Then use search endpoint with properly encoded query
  const driveSearchUrl = `${GRAPH_ENDPOINT}/drives/${containerId}/root/search(q='${encodeURIComponent(sanitizedQuery)}')`;
  
  console.log("Searching container:", containerId, "for:", sanitizedQuery);
  
  try {
    const response = await fetch(driveSearchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Drive search failed:", response.status);
      // Fallback: list all files in the container
      return await listContainerFiles(accessToken, containerId, containerName, userMessage);
    }

    const data = await response.json();
    const items = data.value || [];

    if (items.length === 0) {
      return await listContainerFiles(accessToken, containerId, containerName, userMessage);
    }

    // Format results from drive search
    const responses: string[] = items.slice(0, 5).map((item: any) => {
      const name = item.name || 'Document';
      const size = item.size ? `(${Math.round(item.size / 1024)} KB)` : '';
      return `• **${name}** ${size}`;
    });

    return `Found ${items.length} document(s) in "${containerName}" matching "${sanitizedQuery}":\n\n${responses.join("\n")}\n\nWould you like more details about any of these documents?`;
  } catch (error) {
    console.error("Drive search error:", error);
    return await listContainerFiles(accessToken, containerId, containerName, userMessage);
  }
}

/**
 * Fallback: List files in the container when search fails.
 */
async function listContainerFiles(
  accessToken: string,
  containerId: string,
  containerName: string,
  userMessage: string
): Promise<string> {
  try {
    const listUrl = `${GRAPH_ENDPOINT}/drives/${containerId}/root/children?$top=10`;
    const response = await fetch(listUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return getNoResultsMessage(containerName, userMessage);
    }

    const data = await response.json();
    const items = data.value || [];

    if (items.length === 0) {
      return `The "${containerName}" case doesn't have any documents yet. Upload some files to get started!`;
    }

    const fileList = items.slice(0, 5).map((item: any) => `• ${item.name}`).join("\n");
    return `Here are the documents in "${containerName}":\n\n${fileList}\n\nAsk me about any of these documents, or try a more specific search term.`;
  } catch (error) {
    console.error("List files error:", error);
    return getNoResultsMessage(containerName, userMessage);
  }
}

/**
 * Format search results into a readable response.
 */
function formatSearchResults(hits: any[], containerName: string): string {
  const responses: string[] = [];

  for (const hit of hits.slice(0, 5)) {
    if (hit.extracts && hit.extracts.length > 0) {
      const extractText = cleanCopilotText(hit.extracts[0].text);
      if (extractText) {
        responses.push(`**${hit.resource?.name || 'Document'}:**\n${extractText}`);
      }
    } else if (hit.summary) {
      responses.push(`**${hit.resource?.name || 'Document'}:**\n${cleanCopilotText(hit.summary)}`);
    }
  }

  if (responses.length > 0) {
    return `Based on documents in the ${containerName} case:\n\n${responses.join("\n\n")}`;
  }

  return getNoResultsMessage(containerName, "your query");
}

/**
 * Generate a helpful message when no results are found.
 */
function getNoResultsMessage(containerName: string, userMessage: string): string {
  return `I couldn't find specific information about "${userMessage}" in the ${containerName} case documents. Try:
• Rephrasing your question with different keywords
• Asking about specific document names or topics
• Checking if the documents have been uploaded to this case`;
}
