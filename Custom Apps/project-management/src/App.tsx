
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ConfigProvider } from "./context/ConfigContext";
import { ApiCallsProvider } from "./context/ApiCallsContext";
import { SidebarProvider } from "./components/ui/sidebar";
import Layout from "./components/Layout";
import LayoutWithSearch from "./components/LayoutWithSearch";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Files from "./pages/Files";
import SearchResults from "./pages/SearchResults";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";
import React, { Suspense } from 'react';

// Initialize QueryClient with default options and error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Log global query errors - using the correct listener format for TanStack Query v5
queryClient.getQueryCache().subscribe((event) => {
  // Check if the event has an error using the updated syntax for v5
  if (event.type === 'updated' && event.query.state.status === 'error') {
    console.error('Query cache error:', event.query.state.error);
  }
});

// Simple fallback for loading states
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const App = () => {
  console.log('App component rendering');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <AuthProvider>
            <ConfigProvider>
              <ApiCallsProvider>
                <SidebarProvider>
                  <>
                    <Toaster />
                    <Sonner />
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<ProtectedRouteWithSearch><Index /></ProtectedRouteWithSearch>} />
                        <Route path="/projects" element={<ProtectedRouteWithSearch><Projects /></ProtectedRouteWithSearch>} />
                        <Route path="/files/:containerId" element={<ProtectedRouteWithSearch><Files /></ProtectedRouteWithSearch>} />
                        <Route path="/files" element={<ProtectedRouteWithSearch><Navigate to="/projects" replace /></ProtectedRouteWithSearch>} />
                        <Route path="/search" element={<ProtectedRouteWithSearch><SearchResults /></ProtectedRouteWithSearch>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </>
                </SidebarProvider>
              </ApiCallsProvider>
            </ConfigProvider>
          </AuthProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

// New protected route that includes the search header
const ProtectedRouteWithSearch = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <LayoutWithSearch>{children}</LayoutWithSearch>;
};

export default App;
