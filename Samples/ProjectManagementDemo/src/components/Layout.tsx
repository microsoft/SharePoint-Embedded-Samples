
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Home, FolderOpen, FileText, LogOut, User, Bug } from 'lucide-react';
import { appConfig } from '../config/appConfig';
import { DevModePanel } from './DevModePanel';
import { useApiCalls } from '../context/ApiCallsContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
  const { apiCalls } = useApiCalls();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDevMode = () => {
    setIsDevModeOpen(!isDevModeOpen);
  };

  // If not authenticated, don't render the layout
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full">
      <Sidebar className="bg-blue-600 text-white border-r border-blue-700">
        <SidebarHeader className="px-4 py-3 border-b border-blue-500">
          <div className="text-xl font-semibold text-white">{appConfig.appName}</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === '/'}
                  tooltip="Home"
                  className={`text-white hover:bg-white hover:text-blue-600 ${location.pathname === '/' ? 'bg-blue-800' : ''}`}
                >
                  <Link to="/">
                    <Home className="text-inherit" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === '/projects'}
                  tooltip="Projects"
                  className={`text-white hover:bg-white hover:text-blue-600 ${location.pathname === '/projects' ? 'bg-blue-800' : ''}`}
                >
                  <Link to="/projects">
                    <FolderOpen className="text-inherit" />
                    <span>Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname.startsWith('/files')}
                  tooltip="Files"
                  className={`text-white hover:bg-white hover:text-blue-600 ${location.pathname.startsWith('/files') ? 'bg-blue-800' : ''}`}
                >
                  <Link to="/files">
                    <FileText className="text-inherit" />
                    <span>Files</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="border-t border-blue-500">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleDevMode}
                tooltip="Dev Mode"
                className="text-white hover:bg-white hover:text-blue-600 gap-2"
              >
                <Bug className="text-inherit" />
                <span>Dev Mode</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset className="flex flex-col">
        <header className="flex justify-between items-center px-6 py-3 bg-blue-600 border-b border-blue-700 text-white">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-white hover:bg-white hover:text-blue-600 p-1 rounded" />
            <h1 className="text-xl font-semibold">{appConfig.appName}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <User size={18} className="text-white" />
                <span>{user.username || user.name}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-white hover:text-blue-200"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </main>

        <footer className="p-4 border-t text-center text-sm text-gray-500">
          <a 
            href="https://aka.ms/start-spe"
            target="__blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Get Started with SharePoint Embedded
          </a>
        </footer>
      </SidebarInset>

      {/* Dev Mode Panel */}
      <DevModePanel
        isOpen={isDevModeOpen}
        onToggle={toggleDevMode}
        apiCalls={apiCalls}
      />
    </div>
  );
};

export default Layout;
