
import './App.css';
import React, {
  useState, useEffect,
  useCallback
} from "react";
import {
  Providers,
  ProviderState
} from "@microsoft/mgt-element";
import { Login, SearchBox, SearchResults } from "@microsoft/mgt-react";
import {
  Divider,
  FluentProvider,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tab,
  TabList,
  Text,
  Toolbar,
  ToolbarButton,
  webDarkTheme,
  webLightTheme
} from "@fluentui/react-components";
import {
  Map20Regular,
  People20Regular,
  MoreVertical24Filled,
  Chat32Regular,
  SignOut24Filled,
} from '@fluentui/react-icons';
import './App.css';
import * as Constants from '../common/Constants';
import { ContainerSelector } from '../components/ContainerSelector';
import { IContainer } from '../../../common/schemas/ContainerSchemas';
import { CreateContainerButton } from '../components/CreateContainerButton';
import { Outlet } from 'react-router-dom';
import { ChatSidebar } from '../components/ChatSidebar';


const useIsSignedIn = () => {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);

  useEffect(() => {
    const updateIsSignedIn = () => {
      setIsSignedIn(Providers.globalProvider.state === ProviderState.SignedIn);
    }
    updateIsSignedIn();
    Providers.globalProvider.onStateChanged(updateIsSignedIn);
    return () => {
      Providers.globalProvider.removeStateChangedHandler(updateIsSignedIn);
    }
  }, []);
  return isSignedIn;
}

function App() {  
  const containerTypeId = Constants.SPE_CONTAINER_TYPE_ID;
  const baseSearchQuery = `ContainerTypeId:${containerTypeId}`;
  const [selectedContainer, setSelectedContainer] = useState<IContainer | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>(baseSearchQuery)
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const isSignedIn = useIsSignedIn();
  const mainContentRef = React.useRef(null);
  const loginRef = React.useRef(null);

  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const sidebarRef = React.useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = React.useRef(null);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  }

  const signOut = () => {
    Providers.globalProvider.logout!();
  }

  const onSearchTermChanged = useCallback((e: CustomEvent <string> ) => {
    const term = e.detail;   
    const termQuery = term ? `'${term}'` : '';
    setSearchQuery(`${termQuery} AND ${baseSearchQuery}`);
  }, [baseSearchQuery]);

  const onResizerMouseDown = (e: React.MouseEvent) => {
    if (!sidebarRef.current) {
      return;
    }
    const minSidebarWidth = 200;
    const maxSidebarWidth = 600;
    let prevX = e.clientX;
    let sidebarBounds = sidebarRef.current!.getBoundingClientRect();
    const onMouseMove = (e: MouseEvent) => {
      const newX = prevX - e.x;
      const newWidth = Math.max(minSidebarWidth, Math.min(maxSidebarWidth, sidebarBounds.width + newX));
      sidebarRef.current!.style.minWidth = `${newWidth}px`;
    }

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <div className="App">
        <div className="spe-app-header">
          <div className="spe-app-header-title">
            <Text size={700} weight='semibold'>
              SharePoint Embedded
            </Text>
            <br />
            <Text size={300}>
              TypeScript + React + Azure Functions Sample App
            </Text>
          </div>
          <div className="spe-app-header-search" style={{ display: 'none' }}>
            <SearchBox 
              searchTermChanged={onSearchTermChanged}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(setShowSearchResults.bind(null, false), 200)}
            />
            {showSearchResults && (
            <div className="spe-app-search-results-background">
              <SearchResults 
                className="spe-app-search-results"
                entityTypes={['driveItem']} 
                fetchThumbnail={true} 
                queryString={searchQuery} 
              />
            </div>
            )}
          </div>
          <div className="spe-app-header-actions">
            <Toolbar>
              <ToolbarButton style={{display: 'none'}} onClick={() => toggleSidebar()} icon={<Chat32Regular />} />
              <Login ref={loginRef} loginView='avatar' showPresence={false} />
              <Menu>
                <MenuTrigger>
                  <ToolbarButton aria-label="More" icon={<MoreVertical24Filled />} />
                </MenuTrigger>

                <MenuPopover>
                  <MenuList>
                    <MenuItem icon={<SignOut24Filled />} onClick={() => signOut()}>Sign out</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </Toolbar>
          </div>
        </div>
        <div className="spe-app-content">
          <div className="spe-app-content-navigation">
            <FluentProvider theme={webDarkTheme}>
              <div className="navigation-tabs">
                <TabList vertical={true} size='large' selectedValue="containers">
                  <Tab value="home" icon={<Map20Regular />}>Home</Tab>
                  <Tab value="containers" icon={<People20Regular />}>Containers</Tab>
                </TabList>
              </div>
            </FluentProvider>
            <div className="navigation-divider">
              <Divider />
            </div>
            <div className="navigation-containers">
              {isSignedIn && false && (<>
                <ContainerSelector onContainerSelected={setSelectedContainer} />
                <CreateContainerButton />
              </>)}
            </div>
          </div>
          <div className="spe-app-content-main" ref={mainContentRef}>
            <div className="main-content-header" />
            <div className="main-content-body">
              <Outlet />
            </div>            
          </div>
          <div style={{ display: showSidebar ? 'block' : 'none' }} className="spe-app-content-sidebar" ref={sidebarRef}>
            <div className="sidebar-resizer" ref={sidebarResizerRef} onMouseDown={onResizerMouseDown} />
            <div className="sidebar-content">
              <div className="spe-embedded-chat">
                <ChatSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </FluentProvider>
  );
}

export default App;
