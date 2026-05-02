import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, X } from "lucide-react";
import "./VoiceAssistantPopup.css";
import { useLanguage } from "@/context/LanguageContext";
import {
  executeVoiceCommand,
  normalizeVoiceTranscript,
  resolveVoiceCommand,
} from "@/voice-addon/voiceCommandRegistry";

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function extractTranscript(event) {
  return Array.from(event?.results ?? [])
    .map((entry) => entry?.[0]?.transcript ?? "")
    .join(" ")
    .trim();
}

function extractLiveTranscript(event) {
  let finalText = "";
  let interimText = "";

  for (let index = 0; index < event.results.length; index += 1) {
    const chunk = event.results[index]?.[0]?.transcript ?? "";
    if (event.results[index].isFinal) {
      finalText += `${chunk} `;
    } else {
      interimText += `${chunk} `;
    }
  }

  return {
    finalText: finalText.trim(),
    interimText: interimText.trim(),
  };
}

// Voice assistant trigger + popup UI for listening, transcript typing, and command execution.
export default function VoiceAssistantPopup({
  actionHandlers = {},
  onStatusChange = () => {},
}) {
  const { lang } = useLanguage();
  const recognitionRef = useRef(null);
  const actionHandlersRef = useRef(actionHandlers);
  const autoCloseTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingDoneTimerRef = useRef(null);
  const noSpeechTimerRef = useRef(null);
  const noSpeechCountdownRef = useRef(null);
  const speechRetryTimerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const transcriptRef = useRef("");
  const heardSpeechRef = useRef(false);
  const noSpeechTimedOutRef = useRef(false);
  const micPromptDismissedRef = useRef(false);
  const speechLangOptionsRef = useRef([]);
  const speechLangIndexRef = useRef(0);

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voicePanelStatus, setVoicePanelStatus] = useState("Click microphone and say something...");
  const [transcriptText, setTranscriptText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [typedPreview, setTypedPreview] = useState("");
  const [voiceButtonHost, setVoiceButtonHost] = useState(null);
  const [micPermissionState, setMicPermissionState] = useState("unknown");
  const [listenCountdown, setListenCountdown] = useState(6);
  const [voicePanelAnchor, setVoicePanelAnchor] = useState({ top: null, right: null });

  const promptText = useMemo(() => (
    lang === "hi"
      ? {
          saySomething: "कुछ बोलिए...",
          listening: "वॉइस कमांड के लिए सुन रहा हूँ...",
          noSpeechTimedOut: "6 सेकंड तक आवाज़ नहीं मिली। फिर से बोलें।",
          speakingNow: "अब बोलें",
          waiting: "सुनने का समय",
          examples: ["topo map dikhao", "hybrid map lagao", "hindi to english karo"],
          buttons: {
            stop: "रोकें",
            speak: "बोलें",
          },
        }
      : {
          saySomething: "Say something...",
          listening: "Listening for voice command...",
          noSpeechTimedOut: "No speech detected in 6 seconds. Try to say again.",
          speakingNow: "Speak now",
          waiting: "Listening window",
          examples: ["topo map dikhao", "hybrid map lagao", "hindi to english karo"],
          buttons: {
            stop: "Stop",
            speak: "Speak",
          },
        }
  ), [lang]);

  const updateVoicePanelAnchor = () => {
    if (typeof window === "undefined") {
      return;
    }

    const searchShell = document.querySelector(".search-shell");
    if (!(searchShell instanceof HTMLElement)) {
      setVoicePanelAnchor({ top: null, right: null });
      return;
    }

    const rect = searchShell.getBoundingClientRect();
    const topOffset = window.innerWidth <= 768 ? 8 : 10;
    const nextTop = Math.max(Math.round(rect.bottom + topOffset), 0);
    const nextRight = Math.max(Math.round(window.innerWidth - rect.right), 0);

    setVoicePanelAnchor((current) => (
      current.top === nextTop && current.right === nextRight
        ? current
        : { top: nextTop, right: nextRight }
    ));
  };

  useEffect(() => {
    actionHandlersRef.current = actionHandlers;
  }, [actionHandlers]);

  useEffect(() => {
    transcriptRef.current = transcriptText;
  }, [transcriptText]);

  const closePanelLater = (delayMs = 1200) => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    autoCloseTimerRef.current = window.setTimeout(() => {
      setVoicePanelOpen(false);
      autoCloseTimerRef.current = null;
    }, delayMs);
  };

  const clearTypingTimers = () => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (typingDoneTimerRef.current) {
      window.clearTimeout(typingDoneTimerRef.current);
      typingDoneTimerRef.current = null;
    }
  };

  const clearNoSpeechTimer = () => {
    if (noSpeechTimerRef.current) {
      window.clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }

    if (noSpeechCountdownRef.current) {
      window.clearInterval(noSpeechCountdownRef.current);
      noSpeechCountdownRef.current = null;
    }
  };

  const clearSpeechRetryTimer = () => {
    if (speechRetryTimerRef.current) {
      window.clearTimeout(speechRetryTimerRef.current);
      speechRetryTimerRef.current = null;
    }
  };

  const buildSpeechLangOptions = (nextLang) => {
    const langOptions = nextLang === "hi"
      ? ["hi-IN", "hi", "en-IN", "en-US"]
      : ["en-IN", "en-US", "en-GB", "hi-IN"];

    return Array.from(new Set(langOptions));
  };

  const resetSpeechLangCycle = (nextLang) => {
    const options = buildSpeechLangOptions(nextLang);
    speechLangOptionsRef.current = options;
    speechLangIndexRef.current = 0;
    return options[0];
  };

  const getNextSpeechLang = () => {
    const nextIndex = speechLangIndexRef.current + 1;
    if (nextIndex >= speechLangOptionsRef.current.length) {
      return null;
    }
    speechLangIndexRef.current = nextIndex;
    return speechLangOptionsRef.current[nextIndex];
  };

  const armNoSpeechTimer = () => {
    clearNoSpeechTimer();
    noSpeechTimedOutRef.current = false;
    setListenCountdown(6);

    noSpeechCountdownRef.current = window.setInterval(() => {
      setListenCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    noSpeechTimerRef.current = window.setTimeout(() => {
      if (heardSpeechRef.current || isProcessingRef.current) {
        return;
      }

      noSpeechTimedOutRef.current = true;
      setVoicePanelStatus(promptText.noSpeechTimedOut);
      onStatusChange(promptText.noSpeechTimedOut);
      clearNoSpeechTimer();

      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stale recognition errors.
      }
    }, 6000);
  };

  const getMicrophonePermissionState = async () => {
    if (!navigator?.permissions?.query) {
      return "unknown";
    }

    try {
      const status = await navigator.permissions.query({ name: "microphone" });
      return status.state || "unknown";
    } catch {
      return "unknown";
    }
  };

  const refreshPermissionState = async () => {
    const state = await getMicrophonePermissionState();
    setMicPermissionState(state);
    return state;
  };

  const requestMicrophonePermission = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermissionState("unsupported");
      setVoicePanelStatus("Microphone needs HTTPS/localhost and browser support.");
      onStatusChange("Microphone is unavailable. Use HTTPS/localhost and a supported browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionState("granted");
      micPromptDismissedRef.current = false;
      setVoicePanelStatus("Microphone access granted.");
      onStatusChange("Microphone access granted.");
      return true;
    } catch (error) {
      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        const permissionState = await getMicrophonePermissionState();
        setMicPermissionState(permissionState);

        if (permissionState === "prompt" || permissionState === "unknown") {
          micPromptDismissedRef.current = true;
          setVoicePanelStatus("Microphone permission popup was closed. Tap mic again to refresh.");
          onStatusChange("Microphone permission popup was closed.");
          return false;
        }

        micPromptDismissedRef.current = false;
        setVoicePanelStatus("Microphone permission denied. Allow it in browser site settings.");
        onStatusChange("Microphone permission denied. Please allow microphone access.");
        return false;
      }

      if (error?.name === "NotFoundError") {
        setMicPermissionState("denied");
        setVoicePanelStatus("No microphone device found.");
        onStatusChange("No microphone device found.");
        return false;
      }

      setMicPermissionState("unknown");
      setVoicePanelStatus("Could not access microphone.");
      onStatusChange("Could not access microphone. Check browser/device settings.");
      return false;
    }
  };

  const startRecognition = () => {
    if (!recognitionRef.current) return;

    clearSpeechRetryTimer();

    try {
      recognitionRef.current.start();
      return;
    } catch (error) {
      if (error?.name === "InvalidStateError") {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop failure and retry once.
        }

        window.setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            setVoicePanelStatus("Voice recognition failed to start.");
            onStatusChange("Voice recognition failed to start. Please try again.");
            closePanelLater(1800);
          }
        }, 120);
        return;
      }
    }

    setVoicePanelStatus("Voice recognition failed to start.");
    onStatusChange("Voice recognition failed to start. Please try again.");
    closePanelLater(1800);
  };

  const runCommandFromTranscript = (sourceText) => {
    const commandText = sourceText?.trim();
    if (!commandText) {
      setVoicePanelStatus("No command heard. Please try again.");
      onStatusChange("Unknown command: no speech recognized.");
      return;
    }

    const command = resolveVoiceCommand(commandText);
    if (!command) {
      setVoicePanelStatus(`Unknown command: "${commandText}"`);
      onStatusChange(`Unknown command: "${commandText}".`);
      return;
    }

    setVoicePanelStatus(`Command recognized: "${commandText}"`);
    onStatusChange(`Command recognized: "${commandText}".`);

    const outcome = executeVoiceCommand(command, actionHandlersRef.current, {
      transcript: commandText,
      normalizedTranscript: normalizeVoiceTranscript(commandText),
    });

    if (outcome?.ok === false) {
      setVoicePanelStatus(`Unknown command action for: "${commandText}"`);
      onStatusChange(`Unknown command action: "${commandText}".`);
      return;
    }

    closePanelLater(1000);
  };

  const animateTypingThenRunCommand = (sourceText) => {
    const commandText = sourceText?.trim();
    if (!commandText || isProcessingRef.current) {
      return;
    }

    clearTypingTimers();
    isProcessingRef.current = true;
    setIsProcessingCommand(true);
    setIsListening(false);
    clearNoSpeechTimer();
    setInterimText("");
    setTranscriptText("");
    setTypedPreview("");
    setVoicePanelStatus("Processing command...");
    onStatusChange("Processing voice command...");

    let index = 0;
    const intervalMs = Math.min(42, Math.max(16, Math.floor(820 / commandText.length)));

    typingTimerRef.current = window.setInterval(() => {
      index += 1;
      setTypedPreview(commandText.slice(0, index));

      if (index >= commandText.length) {
        clearTypingTimers();
        typingDoneTimerRef.current = window.setTimeout(() => {
          setTranscriptText(commandText);
          setTypedPreview("");
          setIsProcessingCommand(false);
          isProcessingRef.current = false;
          runCommandFromTranscript(commandText);
        }, 140);
      }
    }, intervalMs);
  };

  const stopAndClosePanel = () => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stale recognition state.
    }

    setIsListening(false);
    setIsProcessingCommand(false);
    isProcessingRef.current = false;
    clearSpeechRetryTimer();
    clearTypingTimers();
    clearNoSpeechTimer();
    setListenCountdown(6);
    setVoicePanelOpen(false);
  };

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setIsSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = resetSpeechLangCycle(lang);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setIsProcessingCommand(false);
      isProcessingRef.current = false;
      clearTypingTimers();
      clearNoSpeechTimer();
      heardSpeechRef.current = false;
      noSpeechTimedOutRef.current = false;
      setTypedPreview("");
      setVoicePanelStatus(promptText.saySomething);
      setVoicePanelOpen(true);
      onStatusChange(promptText.listening);
      armNoSpeechTimer();
    };

    recognition.onend = () => {
      setIsListening(false);
      clearNoSpeechTimer();
      if (noSpeechTimedOutRef.current) {
        noSpeechTimedOutRef.current = false;
        return;
      }

      if (isProcessingRef.current) return;
      if (!transcriptRef.current.trim()) {
        setVoicePanelStatus(
          heardSpeechRef.current
            ? "Listening ended."
            : "Listening ended without speech. Click Speak and allow microphone if prompted.",
        );
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setIsProcessingCommand(false);
      isProcessingRef.current = false;
      clearTypingTimers();
      clearNoSpeechTimer();

      if (event?.error === "language-not-supported") {
        const nextLang = getNextSpeechLang();
        if (nextLang) {
          recognition.lang = nextLang;
          setVoicePanelStatus(`Voice language fallback: trying ${nextLang}.`);
          onStatusChange(`Trying compatible voice language (${nextLang}) for this browser.`);
          clearSpeechRetryTimer();
          speechRetryTimerRef.current = window.setTimeout(() => {
            startRecognition();
          }, 180);
          return;
        }

        setVoicePanelStatus("Speech recognition language is not supported in this browser.");
        onStatusChange("Voice language is unsupported in this browser. Try Chrome or change browser speech settings.");
        closePanelLater(2400);
        return;
      }

      if (event?.error === "network") {
        setVoicePanelStatus("Speech service network error. Check internet or browser voice settings.");
        onStatusChange("Speech recognition network error. Check internet/browser voice settings.");
        return;
      }

      if (event?.error === "not-allowed") {
        setMicPermissionState("denied");
        setVoicePanelStatus("Microphone permission denied.");
        onStatusChange("Microphone permission denied. Please allow microphone access.");
        closePanelLater(2200);
        return;
      }

      if (event?.error === "audio-capture") {
        setVoicePanelStatus("Audio capture failed. Check mic device and browser input.");
        onStatusChange("Audio capture failed. Check microphone device/browser settings.");
        return;
      }

      if (event?.error === "service-not-allowed") {
        setVoicePanelStatus("Speech service blocked in this browser. Try allowing browser speech service.");
        onStatusChange("Speech recognition service is blocked by browser policy/settings.");
        return;
      }

      if (event?.error === "no-speech") {
        setVoicePanelStatus("No speech detected. Try again.");
        onStatusChange("No speech detected. Please try again.");
        closePanelLater(1800);
        return;
      }

      setVoicePanelStatus(`Voice recognition failed (${event?.error || "unknown"}).`);
      onStatusChange(`Voice recognition failed (${event?.error || "unknown"}). Please try again.`);
      closePanelLater(1800);
    };

    recognition.onresult = (event) => {
      if (isProcessingRef.current) {
        return;
      }

      const { finalText, interimText: nextInterim } = extractLiveTranscript(event);
      setInterimText(nextInterim);

      if (finalText || nextInterim) {
        heardSpeechRef.current = true;
        clearNoSpeechTimer();
        setListenCountdown(0);
      }

      if (finalText) {
        setTranscriptText(finalText);
      }

      const allFinal = extractTranscript(event);
      const latestResult = event.results[event.resultIndex];
      if (latestResult?.isFinal && allFinal.trim()) {
        animateTypingThenRunCommand(allFinal.trim());
      }
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      clearSpeechRetryTimer();
      clearTypingTimers();
      clearNoSpeechTimer();
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang, onStatusChange, promptText]);

  useEffect(() => () => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    void refreshPermissionState();
  }, []);

  useEffect(() => {
    if (!voicePanelOpen || typeof window === "undefined") {
      return undefined;
    }

    updateVoicePanelAnchor();

    const handleViewportChange = () => {
      updateVoicePanelAnchor();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [voicePanelOpen]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    let disposed = false;

    const ensureVoiceButtonHost = () => {
      const searchShell = document.querySelector(".search-shell");
      if (!(searchShell instanceof HTMLElement)) {
        return;
      }

      const searchSubmit = searchShell.querySelector("button.search-shell__submit[type='submit']");
      if (!(searchSubmit instanceof HTMLElement)) {
        return;
      }

      let host = searchShell.querySelector(".voice-command-button-host");
      if (!(host instanceof HTMLElement)) {
        host = document.createElement("span");
        host.className = "voice-command-button-host";
        searchShell.insertBefore(host, searchSubmit);
      }

      if (!disposed) {
        setVoiceButtonHost(host);
      }
    };

    ensureVoiceButtonHost();

    const observer = new MutationObserver(() => {
      ensureVoiceButtonHost();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      setVoiceButtonHost(null);
    };
  }, []);

  const handleOpenVoicePanel = () => {
    updateVoicePanelAnchor();
    setVoicePanelOpen(true);
    setTranscriptText("");
    setInterimText("");
    setTypedPreview("");

    if (micPermissionState === "granted") {
      setVoicePanelStatus(promptText.saySomething);
    } else if (micPermissionState === "denied") {
      setVoicePanelStatus("Microphone is blocked. Allow mic in browser site settings.");
    } else {
      setVoicePanelStatus("Click Speak to allow microphone and start listening.");
    }

    void refreshPermissionState();
  };

  const handleVoiceToggle = () => {
    if (!isSupported || !recognitionRef.current) {
      setVoicePanelOpen(true);
      const browserHint = /edg|opr|opera/i.test(navigator.userAgent)
        ? "Edge/Opera support is limited. Try Chrome for full voice command support."
        : "Web Speech API is unavailable in this browser.";
      setVoicePanelStatus(browserHint);
      onStatusChange(browserHint);
      return;
    }

    if (micPromptDismissedRef.current) {
      onStatusChange("Refreshing page to retry microphone permission.");
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }

    if (voicePanelOpen && !isListening && !isProcessingCommand) {
      stopAndClosePanel();
      return;
    }

    handleOpenVoicePanel();

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    if (micPermissionState === "denied") {
      setVoicePanelStatus("Microphone is blocked. Allow mic in browser site settings.");
      onStatusChange("Microphone permission is required before listening.");
      return;
    }

    if (micPermissionState !== "granted") {
      setVoicePanelStatus("Click Speak to allow microphone and start listening.");
      return;
    }

    recognitionRef.current.lang = resetSpeechLangCycle(lang);
    onStatusChange(promptText.listening);
    startRecognition();
  };

  const handleSpeakAction = async () => {
    if (micPromptDismissedRef.current) {
      onStatusChange("Refreshing page to retry microphone permission.");
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    if (micPermissionState === "denied") {
      setVoicePanelStatus("Microphone is blocked. Allow mic in browser site settings.");
      onStatusChange("Microphone permission is required before listening.");
      return;
    }

    let hasPermission = micPermissionState === "granted";
    if (!hasPermission) {
      hasPermission = await requestMicrophonePermission();
    }

    if (!hasPermission) {
      return;
    }

    recognitionRef.current.lang = resetSpeechLangCycle(lang);
    onStatusChange(promptText.listening);
    startRecognition();
  };

  const voicePanel = voicePanelOpen ? (
    <div
      className="voice-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Voice command"
      style={{
        "--voice-panel-top": voicePanelAnchor.top == null ? undefined : `${voicePanelAnchor.top}px`,
        "--voice-panel-right": voicePanelAnchor.right == null ? undefined : `${voicePanelAnchor.right}px`,
      }}
    >
      <div className="voice-panel__backdrop" onClick={stopAndClosePanel} />
      <div className="voice-panel__card">
        <button
          type="button"
          className="voice-panel__close"
          aria-label="Close voice assistant"
          onClick={stopAndClosePanel}
        >
          <X size={15} />
        </button>
        <p className="voice-panel__title">{voicePanelStatus}</p>

        <div className="voice-panel__pulse-row" aria-live="polite">
          <span className={`voice-panel__dot ${isListening ? "voice-panel__dot--active" : ""}`} />
          <span className="voice-panel__pulse-label">
            {isListening ? `${promptText.speakingNow} • ${listenCountdown}s` : promptText.waiting}
          </span>
        </div>

        <div
          className={`voice-panel__meter ${
            isListening ? "voice-panel__meter--active" : ""
          } ${isProcessingCommand ? "voice-panel__meter--processing" : ""}`}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="voice-panel__transcript" role="status" aria-live="polite">
          {typedPreview || transcriptText || interimText
            ? (
              <>
                <span>{typedPreview || transcriptText}</span>
                {interimText ? <span className="voice-panel__interim"> {interimText}</span> : null}
              </>
            )
            : promptText.saySomething}
        </div>

        <div className="voice-panel__examples" aria-label="Voice examples">
          {promptText.examples.map((phrase) => (
            <span
              key={phrase}
              className="voice-panel__example-chip"
            >
              {phrase}
            </span>
          ))}
        </div>

        <div className="voice-panel__actions">
          <button
            type="button"
            className="search-shell__submit voice-panel__action-btn"
            onClick={() => { void handleSpeakAction(); }}
            disabled={isProcessingCommand}
          >
            {isListening ? promptText.buttons.stop : promptText.buttons.speak}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const voiceButton = (
    <button
      type="button"
      className={`search-shell__submit voice-command-button ${
        isListening ? "voice-command-button--listening" : ""
      }`}
      onClick={handleVoiceToggle}
      aria-label={
        isSupported
          ? (isListening ? "Stop voice command" : "Start voice command")
          : "Voice command not supported"
      }
      title={isSupported ? "Voice command" : "Voice command not supported in this browser"}
    >
      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );

  return (
    <>
      {voiceButtonHost
        ? createPortal(voiceButton, voiceButtonHost)
        : voiceButton}

      {voicePanel && typeof document !== "undefined"
        ? createPortal(voicePanel, document.body)
        : null}
    </>
  );
}
