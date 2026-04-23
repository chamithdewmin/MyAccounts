import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { FinanceProvider } from "./contexts/FinanceContext";
import { Toaster } from "./components/ui/toaster";
import "./index.css";

// Preload payment icons so they're instantly available
import cardIcon from "./assets/card.png";
import cashIcon from "./assets/cash.png";
import bankIcon from "./assets/bank.png";
import onlineIcon from "./assets/online_pay.png";
[cardIcon, cashIcon, bankIcon, onlineIcon].forEach((src) => {
  const img = new Image();
  img.src = src;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FinanceProvider>
          <App />
          <Toaster />
        </FinanceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
