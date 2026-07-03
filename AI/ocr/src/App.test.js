import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@microsoft/mgt-element', () => ({
  Providers: {
    globalProvider: undefined,
    onProviderUpdated: jest.fn(),
    removeProviderUpdatedListener: jest.fn()
  },
  ProviderState: {
    SignedIn: 'SignedIn'
  }
}));

jest.mock('@microsoft/mgt-react', () => ({
  Login: () => <button type="button">Sign in</button>
}));

jest.mock('@azure/msal-browser', () => ({
  InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {},
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenSilent: jest.fn(),
    acquireTokenPopup: jest.fn()
  }))
}));

test('renders the OCR sample title', () => {
  render(<App />);
  expect(screen.getByText(/sample spa sharepoint embedded app/i)).toBeInTheDocument();
});
