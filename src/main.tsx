import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ModerationConsole } from "./components/ModerationConsole";
import "./index.css";

// ponytail: pathname check instead of a router — /admin is the only route.
const isAdminRoute = window.location.pathname === "/admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      {isAdminRoute ? <ModerationConsole /> : <App />}
    </AuthProvider>
  </StrictMode>,
);
