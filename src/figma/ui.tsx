import React from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";
import { ChartStudioApp } from "../routes/index";

const root = document.getElementById("root");

if (!root) {
  throw new Error("ChartStudio could not find the plugin UI root element.");
}

createRoot(root).render(
  <React.StrictMode>
    <ChartStudioApp />
  </React.StrictMode>,
);
