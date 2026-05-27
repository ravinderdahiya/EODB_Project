// useDisableDevTools.js
import { useEffect } from "react";

export default function useDisableDevTools() {
  useEffect(() => {
    const configuredValue = String(import.meta.env.VITE_DISABLE_DEVTOOLS || "").toLowerCase();
    const isEnabled = configuredValue ? configuredValue === "true" : import.meta.env.PROD;

    if (!isEnabled) return;

    const onContextMenu = (e) => {
      e.preventDefault();
    };

    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      const isContextMenuKey = e.key === "ContextMenu";
      const isShiftF10 = e.shiftKey && key === "f10";

      const blocked =
        isContextMenuKey ||
        isShiftF10 ||
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
