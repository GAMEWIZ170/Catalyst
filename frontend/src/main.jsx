import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@fontsource/schibsted-grotesk/400.css";
import "@fontsource/schibsted-grotesk/600.css";
import "@fontsource/source-serif-4/400.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles/tokens.css";
import "./styles/global.css";

const router = createBrowserRouter([
  {
    path: "*",
    element: <AuthProvider><App /></AuthProvider>
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
