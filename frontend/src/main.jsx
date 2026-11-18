import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MotionConfig } from "motion/react";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui";
import { TimerProvider } from "./context/TimerContext";
import AstryxTheme from "./components/astryx/AstryxTheme";
import "./styles/app.css";
import { registerServiceWorker } from "./utils/offline";

registerServiceWorker();

const router = createBrowserRouter([
  {
    path: "*",
    element: <AstryxTheme><AuthProvider><TimerProvider><ToastProvider><App /></ToastProvider></TimerProvider></AuthProvider></AstryxTheme>
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} future={{ v7_startTransition: true, v7_relativeSplatPath: true }} />
    </MotionConfig>
  </React.StrictMode>
);
