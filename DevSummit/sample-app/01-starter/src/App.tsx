import React from "react";
import './App.css';
import {
  FluentProvider,
  Text,
  webLightTheme
} from "@fluentui/react-components"
import { Containers } from "./components/Containers";

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <div className="App">
        <Text size={900} weight='bold'>SharePoint Embedded App</Text>
        <div>login | current user</div>
        <Containers />
      </div>
    </FluentProvider>
  );
}

export default App;
