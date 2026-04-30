// useDisableDevTools.js
import { useEffect } from "react";

export default function useDisableDevTools() {
  useEffect(() => {
    const isEnabled = import.meta.env.VITE_DISABLE_DEVTOOLS === "true";

    if (!isEnabled) return;

    console.log("🔒 DevTools disabled for security");

    const onContextMenu = (e) => {
      e.preventDefault();
    };

    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      const blocked =
        key === "f12" ||
        (e.ctrlKey && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
        (ctrlOrCmd && (key === "u" || key === "s"));

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);
}