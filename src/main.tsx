import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Firebase Analytics (tracks page views automatically)
import { analytics } from "./lib/firebase";
analytics.then((a) => {
  if (a) console.log("Google Analytics initialized");
});

createRoot(document.getElementById("root")!).render(<App />);
