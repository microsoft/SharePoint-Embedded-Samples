import { createLovableConfig } from "lovable-agent-playwright-config/config";

export default createLovableConfig({
	// Tests should be placed in the 'e2e' folder (default)
	// Add your custom playwright configuration overrides here
	// Example:
	// timeout: 60000,
	// use: {
	//   baseURL: 'http://localhost:3000',
	// },
});
