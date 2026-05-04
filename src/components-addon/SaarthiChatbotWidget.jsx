import { useEffect, useRef, useState } from "react";
import "./SaarthiChatbotWidget.css";

function readToken(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function buildBridgeStyles({ surface, surfaceStrong, bgSecondary, ink, inkSoft, border, shadowSoft, green, mint }) {
  const gradient = `linear-gradient(135deg, ${green}, ${mint})`;

  return `
html, body, #root {
  background: transparent !important;
}
body {
  overflow: hidden;
}
.header-actions .icon-btn:nth-of-type(2) {
  display: none !important;
}
.app, .app.dark {
  --bg-main: ${surface} !important;
  --bg-secondary: ${bgSecondary} !important;
  --text-main: ${ink} !important;
  --text-soft: ${inkSoft} !important;
  --border: ${border} !important;
  --shadow: ${shadowSoft} !important;
  --user-gradient: ${gradient} !important;
  --bot-bg: ${surfaceStrong} !important;
  --input-bg: ${surface} !important;
  --header-gradient: ${gradient} !important;
}
.floating-wrapper {
  right: 12px !important;
  bottom: 12px !important;
  gap: 6px !important;
}
.notify-dot {
  background: #17b26a !important;
  box-shadow: 0 0 0 2px #ffffff !important;
}
.helper-bubble {
  font-size: 11px !important;
  padding: 7px 10px !important;
}
.floating-btn {
  width: 52px !important;
  height: 52px !important;
}
.floating-bot-img img,
.bot-logo-img img {
  object-fit: contain !important;
}
.chat-box {
  right: 8px !important;
  bottom: 8px !important;
  width: min(320px, calc(100vw - 24px)) !important;
  height: min(500px, calc(100vh - 120px)) !important;
  border-radius: 16px !important;
}
.chat-container {
  padding: 10px !important;
}
.message-bubble {
  font-size: 12.5px !important;
}
.header-text p {
  display: block !important;
  opacity: 1 !important;
}
.faq-suggestions-list {
  max-height: 92px !important;
}
@media (max-width: 640px) {
  .chat-box {
    width: min(300px, calc(100vw - 20px)) !important;
    height: min(450px, calc(100vh - 92px)) !important;
    right: 6px !important;
    bottom: 6px !important;
  }
}
`;
}

export default function SaarthiChatbotWidget() {
  const iframeRef = useRef(null);
  const observerRef = useRef(null);
  const layoutObserverRef = useRef(null);
  const hostLayoutObserverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(28);
  const chatbotCssPath = `${import.meta.env.BASE_URL}chatbot/assets/index-CleebXl6.css`;
  const chatbotJsPath = `${import.meta.env.BASE_URL}chatbot/assets/index-h95SWGsY.js`;
  const chatbotIconPath = `${import.meta.env.BASE_URL}chatbot/assets/eodb-saarthi-_EV4f2aO.png`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    const chatbotCssUrl = new URL(
      chatbotCssPath,
      window.location.origin,
    ).toString();
    const chatbotJsUrl = new URL(
      chatbotJsPath,
      window.location.origin,
    ).toString();
    const iconUrl = new URL(
      chatbotIconPath,
      window.location.origin,
    ).toString();

    const closeChatIfOpen = () => {
      const frameDoc = iframe.contentDocument;
      if (!frameDoc) return;
      if (!frameDoc.querySelector(".chat-box")) return;
      const closeButton = frameDoc.querySelector(".chat-box .close-btn");
      if (closeButton && typeof closeButton.click === "function") {
        closeButton.click();
      }
      window.setTimeout(() => {
        const stillOpen = frameDoc.querySelector(".chat-box");
        if (!stillOpen) return;
        frameDoc.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      }, 0);
    };

    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.height > 0 && rect.width > 0;
    };

    const syncBottomOffset = () => {
      const disclaimer = document.querySelector(".map-disclaimer");
      const tablePanel = document.querySelector(".parcel-table-panel");
      const panelActionRow = document.querySelector(".parcel-table-panel__actions");
      const tableOpenViewport = document.querySelector(".map-stage__viewport--table-open");
      const frameDoc = iframe.contentDocument;
      const chatOpen = Boolean(frameDoc?.querySelector(".chat-box"));
      const onMapPage = Boolean(document.querySelector(".map-stage"));
      const isBottomPanelOpen = isVisible(tablePanel) || isVisible(panelActionRow) || isVisible(tableOpenViewport);
      let nextOffset = onMapPage ? (isBottomPanelOpen ? 96 : 62) : 32;
      if (chatOpen) {
        nextOffset += 18;
      }

      if (isVisible(disclaimer)) {
        nextOffset = Math.max(nextOffset, Math.ceil(disclaimer.getBoundingClientRect().height) + 14);
      }

      if (isVisible(tablePanel)) {
        nextOffset = Math.max(nextOffset, Math.ceil(tablePanel.getBoundingClientRect().height) + 52);
      }

      if (isVisible(panelActionRow)) {
        nextOffset = Math.max(nextOffset, Math.ceil(panelActionRow.getBoundingClientRect().height) + 130);
      }

      if (isVisible(tableOpenViewport)) {
        nextOffset = Math.max(nextOffset, 126);
      }

      setBottomOffset(nextOffset);
    };

    const syncWidget = () => {
      const frameDoc = iframe.contentDocument;
      if (!frameDoc) return;

      const appNode = frameDoc.querySelector(".app");
      const isDark = document.documentElement.dataset.theme === "dark";
      if (appNode) {
        appNode.classList.toggle("dark", isDark);
      }

      frameDoc.querySelectorAll(".floating-bot-img img, .bot-logo-img img, .bot-avatar-img img").forEach((img) => {
        if (img.getAttribute("src") !== iconUrl) {
          img.setAttribute("src", iconUrl);
        }
      });
      const subtitleNode = frameDoc.querySelector(".header-text p");
      if (subtitleNode && subtitleNode.textContent?.trim() !== "Assistant + FAQ") {
        subtitleNode.textContent = "Assistant + FAQ";
      }

      const hostStyles = getComputedStyle(document.documentElement);
      const css = buildBridgeStyles({
        surface: readToken(hostStyles, "--surface", "rgba(255, 255, 255, 0.92)"),
        surfaceStrong: readToken(hostStyles, "--surface-strong", "#ffffff"),
        bgSecondary: readToken(hostStyles, "--bg-secondary", "#f6faf7"),
        ink: readToken(hostStyles, "--ink", "#173248"),
        inkSoft: readToken(hostStyles, "--ink-soft", "#466075"),
        border: readToken(hostStyles, "--border", "rgba(23, 50, 72, 0.11)"),
        shadowSoft: readToken(hostStyles, "--shadow-soft", "0 14px 30px rgba(25, 54, 74, 0.09)"),
        green: readToken(hostStyles, "--green", "#2f8d5d"),
        mint: readToken(hostStyles, "--mint", "#1b9b8b"),
      });

      let bridgeStyle = frameDoc.getElementById("chatbot-theme-bridge");
      if (!bridgeStyle) {
        bridgeStyle = frameDoc.createElement("style");
        bridgeStyle.id = "chatbot-theme-bridge";
        frameDoc.head.appendChild(bridgeStyle);
      }
      bridgeStyle.textContent = css;

      setIsOpen(Boolean(frameDoc.querySelector(".chat-box")));
      syncBottomOffset();
    };

    const setupObservers = () => {
      syncWidget();

      const frameDoc = iframe.contentDocument;
      if (!frameDoc) return;

      layoutObserverRef.current?.disconnect();
      layoutObserverRef.current = new MutationObserver(() => {
        syncWidget();
      });
      layoutObserverRef.current.observe(frameDoc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    };

    iframe.addEventListener("load", setupObservers);
    if (iframe.contentDocument?.readyState === "complete") {
      setupObservers();
    }

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      syncWidget();
    });
    observerRef.current.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    hostLayoutObserverRef.current?.disconnect();
    hostLayoutObserverRef.current = new MutationObserver(() => {
      syncBottomOffset();
    });
    hostLayoutObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const onHostClickCapture = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".parcel-table-toggle, .parcel-table-panel__close")) {
        closeChatIfOpen();
      }
      window.setTimeout(syncBottomOffset, 0);
    };

    const onHostPointerDownCapture = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".parcel-table-toggle, .parcel-table-panel__close")) {
        closeChatIfOpen();
      }
    };

    document.addEventListener("click", onHostClickCapture, true);
    document.addEventListener("pointerdown", onHostPointerDownCapture, true);

    syncBottomOffset();

    return () => {
      iframe.removeEventListener("load", setupObservers);
      observerRef.current?.disconnect();
      layoutObserverRef.current?.disconnect();
      hostLayoutObserverRef.current?.disconnect();
      document.removeEventListener("click", onHostClickCapture, true);
      document.removeEventListener("pointerdown", onHostPointerDownCapture, true);
    };
  }, []);

  return (
    <div
      className={`saarthi-chatbot-widget ${isOpen ? "saarthi-chatbot-widget--open" : ""}`}
      style={{ "--chatbot-bottom-offset": `${bottomOffset}px` }}
    >
      <iframe
        ref={iframeRef}
        src="about:blank"
        srcDoc={`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EODB Saarthi Chatbot</title>
    <link rel="stylesheet" crossorigin href="${chatbotCssPath}">
    <script type="module" crossorigin src="${chatbotJsPath}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`}
        title="EODB Saarthi Chatbot"
        loading="lazy"
      />
    </div>
  );
}
