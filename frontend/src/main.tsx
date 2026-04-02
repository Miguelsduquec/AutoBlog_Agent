import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AccessProvider } from "./access/AccessContext";
import { App } from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AccessProvider>
        <App />
      </AccessProvider>
    </BrowserRouter>
  </React.StrictMode>
);
