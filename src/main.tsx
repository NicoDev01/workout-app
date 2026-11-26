import { StrictMode, lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"

const DemoShell = import.meta.env.VITE_DEMO === "1" ? lazy(() => import("./demo/DemoShell").then((m) => ({ default: m.DemoShell }))) : null

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {DemoShell ? (
      <Suspense fallback={<div className="min-h-dvh bg-background" />}>
        <DemoShell />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
)
