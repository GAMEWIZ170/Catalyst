import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";

const router = createBrowserRouter([
  {
    path: "*",
    element: <AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider>
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true, v7_relativeSplatPath: true }} />
  </React.StrictMode>
);
