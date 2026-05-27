import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Globe,
  Languages,
  Layers,
  Map,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Route,
  TreePine,
  ZoomIn,
} from "lucide-react";
import "./VoiceAssistantPopup.css";
import { useLanguage } from "@/context/LanguageContext";
import {
  extractCadastralSelectionFromAnyPayload,
  requestCadastralHindiSearch,
  requestOwnerApiResult,
} from "@/services/ownerSearchService";
import {
  VOICE_COMMAND_ACTIONS,
  executeVoiceCommand,
  normalizeVoiceTranscript,
  resolveVoiceCommand,
} from "@/voice-addon/voiceCommandRegistry";

const HINDI_VILLAGE_TOKENS = ["\u0917\u093e\u0902\u0935", "\u0917\u093e\u0901\u0935", "\u0917\u094d\u0930\u093e\u092e"];
const HINDI_MURABBA_TOKENS = ["\u092e\u0941\u0930\u092c\u093e", "\u092e\u0941\u0930\u092c\u094d\u092c\u093e"];
const HINDI_KHASRA_TOKENS = ["\u0916\u0938\u0930\u093e"];
const HINDI_DISTRICT_TOKENS = ["\u091c\u093f\u0932\u093e"];
const HINDI_TEHSIL_TOKENS = ["\u0924\u0939\u0938\u0940\u0932"];
const HINDI_NAME_TOKENS = ["\u0928\u093e\u092e"];
const LATIN_DISTRICT_TOKENS = ["district", "jila", "zilla"];
const LATIN_TEHSIL_TOKENS = ["tehsil", "tahsil", "tehseel"];
const LATIN_VILLAGE_TOKENS = ["village", "gaon", "gaav", "gav", "gram"];
const LATIN_MURABBA_TOKENS = ["murabba", "muraba", "murraba"];
const LATIN_KHASRA_TOKENS = ["khasra", "khasara", "kasra"];
const LATIN_NAME_TOKENS = ["name", "naam"];

function asCleanText(value) {
  return String(value ?? "").trim();
}

function hasAnyToken(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function analyzeHindiOwnerDetailQuery(value) {
  const text = asCleanText(value);
  if (!text) {
    return { isCandidate: false, isComplete: false, missingLabels: [] };
  }

  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const lowerText = text.toLowerCase();

  const hasDistrict = hasAnyToken(text, HINDI_DISTRICT_TOKENS) || hasAnyToken(lowerText, LATIN_DISTRICT_TOKENS);
  const hasTehsil = hasAnyToken(text, HINDI_TEHSIL_TOKENS) || hasAnyToken(lowerText, LATIN_TEHSIL_TOKENS);
  const hasVillage = hasAnyToken(text, HINDI_VILLAGE_TOKENS) || hasAnyToken(lowerText, LATIN_VILLAGE_TOKENS);
  const hasMurabba = hasAnyToken(text, HINDI_MURABBA_TOKENS) || hasAnyToken(lowerText, LATIN_MURABBA_TOKENS);
  const hasKhasra = hasAnyToken(text, HINDI_KHASRA_TOKENS) || hasAnyToken(lowerText, LATIN_KHASRA_TOKENS);
  const hasName = hasAnyToken(text, HINDI_NAME_TOKENS) || hasAnyToken(lowerText, LATIN_NAME_TOKENS);

  const isCandidate = hasDistrict || hasTehsil || hasVillage || hasMurabba || hasKhasra || hasName;
  if (!isCandidate) {
    return { isCandidate: false, isComplete: false, missingLabels: [] };
  }

  if (!hasDevanagari && !(hasDistrict && hasTehsil && hasVillage && hasMurabba && hasKhasra)) {
    return { isCandidate: false, isComplete: false, missingLabels: [] };
  }

  const missingLabels = [];
  if (!hasDistrict) missingLabels.push("\u091c\u093f\u0932\u093e");
  if (!hasTehsil) missingLabels.push("\u0924\u0939\u0938\u0940\u0932");
  if (!hasVillage) missingLabels.push("\u0917\u093e\u0901\u0935");
  if (!hasMurabba) missingLabels.push("\u092e\u0941\u0930\u092c\u094d\u092c\u093e");
  if (!hasKhasra) missingLabels.push("\u0916\u0938\u0930\u093e");

  return {
    isCandidate: true,
    isComplete: missingLabels.length === 0,
    missingLabels,
  };
}

async function resolveHindiOwnerSelectionFromBackend(queryText) {
  const ownerLookup = await requestOwnerApiResult(queryText);
  if (!ownerLookup?.ok) {
    return {
      ok: false,
      handled: true,
      message: ownerLookup?.error || "Owner details request failed.",
      payload: ownerLookup?.payload,
    };
  }
  const selection = extractCadastralSelectionFromAnyPayload(ownerLookup.payload, queryText);
  if (!selection) {
    return { ok: false, handled: true, message: "Hindi owner details could not be mapped to cadastral codes.", payload: ownerLookup.payload };
  }
  return { ok: true, handled: true, selection, payload: ownerLookup.payload };
}

async function resolveHindiSelectionFromCadastralBackend(queryText) {
  const cadastralLookup = await requestCadastralHindiSearch(queryText);
  if (!cadastralLookup?.ok) {
    return {
      ok: false,
      handled: true,
      message: cadastralLookup?.error || "Cadastral lookup failed.",
      payload: cadastralLookup?.payload,
    };
  }

  const selection = extractCadastralSelectionFromAnyPayload(cadastralLookup.payload, queryText);
  if (!selection) {
    return { ok: false, handled: true, message: "Cadastral lookup returned incomplete parcel codes.", payload: cadastralLookup.payload };
  }
  return { ok: true, handled: true, selection, payload: cadastralLookup.payload };
}

function requestOpenCadastralOnMap(selectionPayload) {
  return new Promise((resolve) => {
    const requestId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cleanup = (handler) => {
      window.removeEventListener("eodb-chatbot-cadastral-open-result", handler);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup(onResult);
      resolve({ ok: false, message: "Map did not respond in time." });
    }, 30000);

    const onResult = (event) => {
      const detail = event?.detail || {};
      if (detail?.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeoutId);
      cleanup(onResult);
      resolve(detail || { ok: false, message: "Could not open cadastral parcel on map." });
    };

    window.addEventListener("eodb-chatbot-cadastral-open-result", onResult);
    window.dispatchEvent(
      new CustomEvent("eodb-chatbot-open-cadastral", {
        detail: {
          ...selectionPayload,
          __requestSource: "voice-assistant",
          __requestId: requestId,
        },
      }),
    );
  });
}

// Icon mapping for suggestion chips — keyed on the phrase string
const CHIP_ICON = {
  "topo map dikhao":       <Map size={11} />,
  "hybrid map lagao":      <Layers size={11} />,
  "satellite map dikhao":  <Globe size={11} />,
  "streets map dikhao":    <Route size={11} />,
  "district boundary on":  <Building2 size={11} />,
  "district boundary off": <Building2 size={11} />,
  "village boundary on":   <TreePine size={11} />,
  "village boundary off":  <TreePine size={11} />,
  "all boundaries on":     <Navigation size={11} />,
  "all boundaries off":    <Navigation size={11} />,
  "panipat district dikhao":   <MapPin size={11} />,
  "zoom to gurugram district": <ZoomIn size={11} />,
  "ganaur tehsil dikhao":      <MapPin size={11} />,
  "zoom to thanesar tehsil":   <ZoomIn size={11} />,
  "sisana village dikhao":     <MapPin size={11} />,
  "zoom to jhajjar district":  <ZoomIn size={11} />,
  "hindi to english karo":     <Languages size={11} />,
  "english to hindi karo":     <Languages size={11} />,
};

const CHIP_DIRECT_COMMANDS = {
  "panipat district dikhao": {
    id: "chip.admin.panipat.district",
    actionId: VOICE_COMMAND_ACTIONS.GO_TO_ADMIN_BOUNDARY_BY_NAME,
    boundaryType: "district",
    boundaryName: "Panipat",
  },
  "zoom to gurugram district": {
    id: "chip.admin.gurugram.district",
    actionId: VOICE_COMMAND_ACTIONS.GO_TO_ADMIN_BOUNDARY_BY_NAME,
    boundaryType: "district",
    boundaryName: "Gurugram",
  },
  "ganaur tehsil dikhao": {
    id: "chip.admin.ganaur.tehsil",
    actionId: VOICE_COMMAND_ACTIONS.GO_TO_ADMIN_BOUNDARY_BY_NAME,
    boundaryType: "tehsil",
    boundaryName: "Ganaur",
  },
  "zoom to thanesar tehsil": {
    id: "chip.admin.thanesar.tehsil",
    actionId: VOICE_COMMAND_ACTIONS.GO_TO_ADMIN_BOUNDARY_BY_NAME,
    boundaryType: "tehsil",
    boundaryName: "Thanesar",
  },
  "sisana village dikhao": {
    id: "chip.admin.sisana.village",
    actionId: VOICE_COMMAND_ACTIONS.GO_TO_ADMIN_BOUNDARY_BY_NAME,
    boundaryType: "village",
    boundaryName: "Sisana",
  },
  "zoom to jhajjar district": {
    id: "chip.admin.jhajjar.district",
    actionId: VOICE_COMMAND_ACTIONS.GO_TO_ADMIN_BOUNDARY_BY_NAME,
    boundaryType: "district",
    boundaryName: "Jhajjar",
  },
};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
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
  for (let i = 0; i < event.results.length; i += 1) {
    const chunk = event.results[i]?.[0]?.transcript ?? "";
    if (event.results[i].isFinal) finalText += `${chunk} `;
    else interimText += `${chunk} `;
  }
  return { finalText: finalText.trim(), interimText: interimText.trim() };
}

// Voice UI: mic button + inline bar (replaces input row) + chips row.
// No separate popup/modal — the search bar expands in place.
export default function VoiceAssistantPopup({
  actionHandlers = {},
  onStatusChange = () => {},
}) {
  const { lang } = useLanguage();

  // ── Refs ──────────────────────────────────────────────────────────
  const recognitionRef        = useRef(null);
  const actionHandlersRef     = useRef(actionHandlers);
  const autoCloseTimerRef     = useRef(null);
  const typingTimerRef        = useRef(null);
  const typingDoneTimerRef    = useRef(null);
  const noSpeechTimerRef      = useRef(null);
  const noSpeechCountdownRef  = useRef(null);
  const speechRetryTimerRef   = useRef(null);
  const processingTimerRef    = useRef(null);
  const isProcessingRef       = useRef(false);
  const transcriptRef         = useRef("");
  const interimRef            = useRef("");
  const heardSpeechRef        = useRef(false);
  const noSpeechTimedOutRef   = useRef(false);
  const micPromptDismissedRef = useRef(false);
  const speechLangOptionsRef  = useRef([]);
  const speechLangIndexRef    = useRef(0);

  // ── State ─────────────────────────────────────────────────────────
  const [isSupported,        setIsSupported]        = useState(false);
  const [isListening,        setIsListening]        = useState(false);
  const [isProcessingCmd,    setIsProcessingCmd]    = useState(false);
  const [voicePanelOpen,     setVoicePanelOpen]     = useState(false);
  const [voicePanelStatus,   setVoicePanelStatus]   = useState("Tap microphone and say something...");
  const [transcriptText,     setTranscriptText]     = useState("");
  const [interimText,        setInterimText]        = useState("");
  const [typedPreview,       setTypedPreview]       = useState("");
  const [processingPercent,  setProcessingPercent]  = useState(0);
  const [micPermissionState, setMicPermissionState] = useState("unknown");
  const [listenCountdown,    setListenCountdown]    = useState(6);

  // DOM host refs — populated once then kept stable
  const [voiceButtonHost, setVoiceButtonHost] = useState(null); // mic btn host
  const [voiceBarHost,    setVoiceBarHost]    = useState(null); // bar content (replaces input)
  const [voiceChipsHost,  setVoiceChipsHost]  = useState(null); // chips row (full-width)

  // ── i18n prompts ──────────────────────────────────────────────────
  const promptText = useMemo(() => (
    lang === "hi"
      ? {
          saySomething:    "कुछ बोलिए...",
          listening:       "वॉइस कमांड के लिए सुन रहा हूँ...",
          noSpeechTimedOut:"फिर से प्रयास करें।",
          speechNotDetected: "आवाज़ नहीं मिली।",
          processingRequest: "प्रक्रिया जारी",
          speakingNow:     "सुन रहा हूँ",
          waiting:         "माइक दबाएं",
          examples: [
            "topo map dikhao", "hybrid map lagao", "satellite map dikhao",
            "streets map dikhao", "district boundary on", "district boundary off",
            "village boundary on", "village boundary off", "all boundaries on",
            "all boundaries off", "panipat district dikhao", "zoom to gurugram district",
            "ganaur tehsil dikhao", "zoom to thanesar tehsil", "sisana village dikhao",
            "zoom to jhajjar district", "hindi to english karo", "english to hindi karo",
          ],
          buttons: { stop: "रोकें", speak: "बोलें" },
        }
      : {
          saySomething:    "Say something...",
          listening:       "Listening for voice command...",
          noSpeechTimedOut:"Try again.",
          speechNotDetected: "Speech not detected.",
          processingRequest: "Processing",
          speakingNow:     "Listening",
          waiting:         "Press mic to speak",
          examples: [
            "topo map dikhao", "hybrid map lagao", "satellite map dikhao",
            "streets map dikhao", "district boundary on", "district boundary off",
            "village boundary on", "village boundary off", "all boundaries on",
            "all boundaries off", "panipat district dikhao", "zoom to gurugram district",
            "ganaur tehsil dikhao", "zoom to thanesar tehsil", "sisana village dikhao",
            "zoom to jhajjar district", "hindi to english karo", "english to hindi karo",
          ],
          buttons: { stop: "Stop", speak: "Speak" },
        }
  ), [lang]);

  // ── Timer helpers ─────────────────────────────────────────────────
  useEffect(() => { actionHandlersRef.current = actionHandlers; }, [actionHandlers]);
  useEffect(() => { transcriptRef.current = transcriptText; },    [transcriptText]);
  useEffect(() => { interimRef.current = interimText; },          [interimText]);

  const closePanelLater = (ms = 1200) => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    autoCloseTimerRef.current = window.setTimeout(() => {
      setVoicePanelOpen(false);
      autoCloseTimerRef.current = null;
    }, ms);
  };

  const clearTypingTimers = () => {
    if (typingTimerRef.current)     { window.clearInterval(typingTimerRef.current);     typingTimerRef.current = null; }
    if (typingDoneTimerRef.current) { window.clearTimeout(typingDoneTimerRef.current);  typingDoneTimerRef.current = null; }
  };

  const clearNoSpeechTimer = () => {
    if (noSpeechTimerRef.current)     { window.clearTimeout(noSpeechTimerRef.current);   noSpeechTimerRef.current = null; }
    if (noSpeechCountdownRef.current) { window.clearInterval(noSpeechCountdownRef.current); noSpeechCountdownRef.current = null; }
  };

  const clearSpeechRetryTimer = () => {
    if (speechRetryTimerRef.current) { window.clearTimeout(speechRetryTimerRef.current); speechRetryTimerRef.current = null; }
  };

  const clearProcessingTimer = () => {
    if (processingTimerRef.current) {
      window.clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  };

  const startProcessingProgress = (startingPct = 52) => {
    clearProcessingTimer();
    setProcessingPercent((current) => Math.max(current, startingPct));
    processingTimerRef.current = window.setInterval(() => {
      setProcessingPercent((current) => {
        if (current >= 95) return 95;
        if (current < 70) return current + 4;
        if (current < 85) return current + 2;
        return current + 1;
      });
    }, 240);
  };

  const finishProcessingProgress = () => {
    clearProcessingTimer();
    setProcessingPercent(100);
    window.setTimeout(() => setProcessingPercent(0), 280);
  };

  const buildSpeechLangOptions = (nextLang) => {
    const opts = nextLang === "hi"
      ? ["hi-IN", "hi", "en-IN", "en-US"]
      : ["en-IN", "en-US", "en-GB", "hi-IN"];
    return Array.from(new Set(opts));
  };

  const resetSpeechLangCycle = (nextLang) => {
    const opts = buildSpeechLangOptions(nextLang);
    speechLangOptionsRef.current = opts;
    speechLangIndexRef.current = 0;
    return opts[0];
  };

  const getNextSpeechLang = () => {
    const next = speechLangIndexRef.current + 1;
    if (next >= speechLangOptionsRef.current.length) return null;
    speechLangIndexRef.current = next;
    return speechLangOptionsRef.current[next];
  };

  const armNoSpeechTimer = () => {
    clearNoSpeechTimer();
    noSpeechTimedOutRef.current = false;
    setListenCountdown(6);
    noSpeechCountdownRef.current = window.setInterval(() => {
      setListenCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    noSpeechTimerRef.current = window.setTimeout(() => {
      if (heardSpeechRef.current || isProcessingRef.current) return;
      noSpeechTimedOutRef.current = true;
      setVoicePanelStatus(promptText.noSpeechTimedOut);
      onStatusChange(promptText.noSpeechTimedOut);
      clearNoSpeechTimer();
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    }, 6000);
  };

  // ── Mic permission helpers ────────────────────────────────────────
  const getMicPermission = async () => {
    if (!navigator?.permissions?.query) return "unknown";
    try {
      const s = await navigator.permissions.query({ name: "microphone" });
      return s.state || "unknown";
    } catch { return "unknown"; }
  };

  const refreshPermission = async () => {
    const s = await getMicPermission();
    setMicPermissionState(s);
    return s;
  };

  const requestMicPermission = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermissionState("unsupported");
      setVoicePanelStatus("Microphone needs HTTPS (or localhost) and browser support.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermissionState("granted");
      micPromptDismissedRef.current = false;
      setVoicePanelStatus("Microphone access granted.");
      return true;
    } catch (err) {
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        const s = await getMicPermission();
        setMicPermissionState(s);
        if (s === "prompt" || s === "unknown") {
          micPromptDismissedRef.current = true;
          setVoicePanelStatus("Microphone permission popup closed. Tap mic again to retry.");
          return false;
        }
        setVoicePanelStatus("Microphone permission denied. Allow it in browser site settings.");
        return false;
      }
      if (err?.name === "NotFoundError") {
        setMicPermissionState("denied");
        setVoicePanelStatus("No microphone device found.");
        return false;
      }
      setVoicePanelStatus("Could not access microphone.");
      return false;
    }
  };

  // ── Recognition control ───────────────────────────────────────────
  const startRecognition = () => {
    if (!recognitionRef.current) return;
    clearSpeechRetryTimer();
    try {
      recognitionRef.current.start();
      return;
    } catch (err) {
      if (err?.name === "InvalidStateError") {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        window.setTimeout(() => {
          try { recognitionRef.current?.start(); } catch {
            setVoicePanelStatus("Voice recognition failed to start.");
            closePanelLater(1800);
          }
        }, 120);
        return;
      }
    }
    setVoicePanelStatus("Voice recognition failed to start.");
    closePanelLater(1800);
  };

  const runCommandFromTranscript = async (sourceText, forcedCommand = null) => {
    const commandText = sourceText?.trim();
    try {
      if (!commandText) {
        setVoicePanelStatus("No command heard. Please try again.");
        return;
      }

      const hindiOwnerQuery = analyzeHindiOwnerDetailQuery(commandText);
      const shouldRunHindiLandResolver = hindiOwnerQuery.isCandidate && hindiOwnerQuery.isComplete;
      if (shouldRunHindiLandResolver) {

        setVoicePanelStatus("Hindi land query detected. Checking backend...");
        onStatusChange("Hindi land-details query detected. Fetching from backend...");
        try {
          const ownerLookup = await resolveHindiOwnerSelectionFromBackend(commandText);
          let resolvedSelection = ownerLookup?.selection || null;

          if (!resolvedSelection) {
            setVoicePanelStatus("Owner API did not return full parcel. Trying cadastral resolver...");
            onStatusChange("Trying cadastral resolver with spoken query...");
            const cadastralLookup = await resolveHindiSelectionFromCadastralBackend(commandText);
            if (cadastralLookup?.ok && cadastralLookup?.selection) {
              resolvedSelection = cadastralLookup.selection;
            }
          }

          if (resolvedSelection) {
            setVoicePanelStatus("Owner details matched. Opening cadastral parcel and waiting for map zoom...");
            onStatusChange("Owner details matched. Opening parcel on map and waiting for zoom...");
            const openResult = await requestOpenCadastralOnMap(resolvedSelection);
            if (openResult?.ok) {
              setVoicePanelStatus("Hindi cadastral parcel opened on map.");
              onStatusChange(openResult?.message || "Opened cadastral parcel on map.");
              closePanelLater(1000);
              return;
            }
            const failMessage = openResult?.message || "Could not open cadastral parcel on map.";
            setVoicePanelStatus(failMessage);
            onStatusChange(failMessage);
            return;
          }

          const failMessage = ownerLookup?.message || "Hindi query processed, but parcel details were not found.";
          setVoicePanelStatus(failMessage);
          onStatusChange(failMessage);
          return;
        } catch {
          setVoicePanelStatus("Hindi query failed while calling backend.");
          onStatusChange("Hindi query failed while calling backend.");
          return;
        }
      }

      const command = forcedCommand || resolveVoiceCommand(commandText);
      if (!command && hindiOwnerQuery.isCandidate) {
        const missing = hindiOwnerQuery.missingLabels.join(", ");
        const message = missing
          ? `Hindi land query detected. Missing fields: ${missing}.`
          : "Hindi land query detected, but details are incomplete.";
        setVoicePanelStatus(message);
        onStatusChange(message);
        return;
      }

      if (!command) {
        const norm = normalizeVoiceTranscript(commandText);
        let fb = { ok: false };
        try {
          fb = await Promise.resolve(executeVoiceCommand(
            { id: "voice.fallback.transcript", actionId: VOICE_COMMAND_ACTIONS.HANDLE_FALLBACK_TRANSCRIPT, normalizedTranscript: norm },
            actionHandlersRef.current,
            { transcript: commandText, normalizedTranscript: norm },
          ));
        } catch { fb = { ok: false }; }
        if (fb?.pendingSelection) {
          const message = fb?.message || "Suggestions are ready. Please select one from the search list.";
          setVoicePanelStatus(message);
          onStatusChange(message);
          stopAndClosePanel();
          return;
        }
        if (fb?.ok === false) {
          setVoicePanelStatus("Command not recognized. Please try again.");
          onStatusChange("Command not recognized. Please try again.");
          return;
        }
        setVoicePanelStatus(`Command recognized: "${commandText}"`);
        closePanelLater(1000);
        return;
      }
      setVoicePanelStatus(`Command recognized: "${commandText}"`);
      onStatusChange(`Command recognized: "${commandText}".`);
      let outcome = { ok: false };
      try {
        outcome = await Promise.resolve(executeVoiceCommand(command, actionHandlersRef.current, {
          transcript: commandText,
          normalizedTranscript: normalizeVoiceTranscript(commandText),
        }));
      } catch { outcome = { ok: false }; }
      if (outcome?.ok === false) {
        setVoicePanelStatus("Command action failed. Please try again.");
        onStatusChange("Command action failed. Please try again.");
        return;
      }
      closePanelLater(1000);
    } finally {
      finishProcessingProgress();
      setIsProcessingCmd(false);
      isProcessingRef.current = false;
    }
  };

  const animateTypingThenRunCommand = (sourceText, forcedCommand = null) => {
    const txt = sourceText?.trim();
    if (!txt || isProcessingRef.current) return;
    clearTypingTimers();
    clearProcessingTimer();
    isProcessingRef.current = true;
    setIsProcessingCmd(true);
    setIsListening(false);
    clearNoSpeechTimer();
    setInterimText("");
    setTranscriptText("");
    setTypedPreview("");
    setProcessingPercent(12);
    setVoicePanelStatus(`${promptText.processingRequest}...`);
    onStatusChange("Processing voice command...");
    let idx = 0;
    const ms = Math.min(42, Math.max(16, Math.floor(820 / txt.length)));
    typingTimerRef.current = window.setInterval(() => {
      idx += 1;
      const typingPct = Math.min(46, Math.floor((idx / txt.length) * 46));
      setProcessingPercent(typingPct);
      setTypedPreview(txt.slice(0, idx));
      if (idx >= txt.length) {
        clearTypingTimers();
        typingDoneTimerRef.current = window.setTimeout(() => {
          setTranscriptText(txt);
          setTypedPreview("");
          setVoicePanelStatus(`${promptText.processingRequest}...`);
          startProcessingProgress(52);
          runCommandFromTranscript(txt, forcedCommand);
        }, 140);
      }
    }, ms);
  };

  const stopAndClosePanel = () => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
    setIsProcessingCmd(false);
    clearProcessingTimer();
    setProcessingPercent(0);
    isProcessingRef.current = false;
    clearSpeechRetryTimer();
    clearTypingTimers();
    clearNoSpeechTimer();
    setListenCountdown(6);
    setVoicePanelOpen(false);
  };

  // ── Speech recognition setup ──────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) { setIsSupported(false); return undefined; }

    const r = new SpeechRecognition();
    r.lang = resetSpeechLangCycle(lang);
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setIsListening(true);
      setIsProcessingCmd(false);
      clearProcessingTimer();
      setProcessingPercent(0);
      isProcessingRef.current = false;
      transcriptRef.current = "";
      interimRef.current = "";
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

    r.onend = () => {
      setIsListening(false);
      clearNoSpeechTimer();
      if (noSpeechTimedOutRef.current) { noSpeechTimedOutRef.current = false; return; }
      if (isProcessingRef.current) return;
      const fallbackTranscript = `${interimRef.current || ""}`.trim();
      if (!transcriptRef.current.trim() && fallbackTranscript) {
        animateTypingThenRunCommand(fallbackTranscript);
        return;
      }
      if (!transcriptRef.current.trim()) {
        setVoicePanelStatus(
          heardSpeechRef.current
            ? "Listening ended."
            : promptText.speechNotDetected,
        );
      }
    };

    r.onerror = (event) => {
      setIsListening(false);
      setIsProcessingCmd(false);
      clearProcessingTimer();
      setProcessingPercent(0);
      isProcessingRef.current = false;
      clearTypingTimers();
      clearNoSpeechTimer();
      const e = event?.error;
      if (e === "language-not-supported") {
        const next = getNextSpeechLang();
        if (next) {
          r.lang = next;
          setVoicePanelStatus(`Trying language: ${next}.`);
          clearSpeechRetryTimer();
          speechRetryTimerRef.current = window.setTimeout(() => startRecognition(), 180);
          return;
        }
        setVoicePanelStatus("Speech language not supported. Try Chrome.");
        closePanelLater(2400);
        return;
      }
      if (e === "network")          { setVoicePanelStatus("Network error. Check internet connection."); return; }
      if (e === "not-allowed")      { setMicPermissionState("denied"); setVoicePanelStatus("Microphone permission denied."); closePanelLater(2200); return; }
      if (e === "audio-capture")    { setVoicePanelStatus("Audio capture failed. Check microphone device."); return; }
      if (e === "service-not-allowed") { setVoicePanelStatus("Speech service blocked by browser."); return; }
      if (e === "no-speech")        { setVoicePanelStatus(promptText.noSpeechTimedOut); closePanelLater(1800); return; }
      setVoicePanelStatus(`Voice error (${e || "unknown"}).`);
      closePanelLater(1800);
    };

    r.onresult = (event) => {
      if (isProcessingRef.current) return;
      const { finalText, interimText: nextInterim } = extractLiveTranscript(event);
      interimRef.current = nextInterim;
      setInterimText(nextInterim);
      if (finalText || nextInterim) { heardSpeechRef.current = true; clearNoSpeechTimer(); setListenCountdown(0); }
      if (finalText) setTranscriptText(finalText);
      const allFinal = extractTranscript(event);
      transcriptRef.current = allFinal.trim();
      const latest = event.results[event.resultIndex];
      if (latest?.isFinal && allFinal.trim()) animateTypingThenRunCommand(allFinal.trim());
    };

    recognitionRef.current = r;
    setIsSupported(true);

    return () => {
      clearSpeechRetryTimer(); clearTypingTimers(); clearNoSpeechTimer(); clearProcessingTimer();
      r.onstart = null; r.onend = null; r.onerror = null; r.onresult = null;
      r.stop();
      recognitionRef.current = null;
    };
  }, [lang, onStatusChange, promptText]);

  useEffect(() => () => {
    if (autoCloseTimerRef.current) { window.clearTimeout(autoCloseTimerRef.current); autoCloseTimerRef.current = null; }
    clearProcessingTimer();
  }, []);

  useEffect(() => { void refreshPermission(); }, []);

  // ── Toggle search-shell expanded class ────────────────────────────
  useEffect(() => {
    const shell = document.querySelector(".search-shell");
    if (!(shell instanceof HTMLElement)) return undefined;
    if (voicePanelOpen) {
      shell.classList.add("search-shell--voice-open");
    } else {
      shell.classList.remove("search-shell--voice-open");
    }
    return () => shell.classList.remove("search-shell--voice-open");
  }, [voicePanelOpen]);

  // ── Escape + click outside ────────────────────────────────────────
  useEffect(() => {
    if (!voicePanelOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") stopAndClosePanel(); };
    const onPtr = (e) => {
      const shell = document.querySelector(".search-shell");
      if (shell && !shell.contains(e.target)) stopAndClosePanel();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPtr, { capture: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPtr, { capture: true });
    };
  }, [voicePanelOpen]);

  // ── DOM host injection ────────────────────────────────────────────
  // Three hosts injected imperatively into the search-shell form:
  //   1. voice-command-button-host  — mic button (before Search button)
  //   2. voice-bar-host             — bar content replacing the input (after input)
  //   3. voice-chips-host           — full-width chips row (last child)
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    let disposed = false;

    const ensureHosts = () => {
      const shell = document.querySelector(".search-shell");
      if (!(shell instanceof HTMLElement)) return;

      const submitBtn = shell.querySelector("button.search-shell__submit[type='submit']");
      const input     = shell.querySelector(".search-shell__input");

      // 1. Mic button host — before Search button
      if (submitBtn instanceof HTMLElement) {
        let btnHost = shell.querySelector(".voice-command-button-host");
        if (!(btnHost instanceof HTMLElement)) {
          btnHost = document.createElement("span");
          btnHost.className = "voice-command-button-host";
          shell.insertBefore(btnHost, submitBtn);
        }
        if (!disposed) setVoiceButtonHost(btnHost);
      }

      // 2. Bar content host — inserted immediately after the input element
      let barHost = shell.querySelector(".voice-bar-host");
      if (!(barHost instanceof HTMLElement)) {
        barHost = document.createElement("div");
        barHost.className = "voice-bar-host";
        const insertBefore = (input && input.nextSibling) ? input.nextSibling
          : shell.querySelector(".voice-command-button-host") || submitBtn;
        if (insertBefore) shell.insertBefore(barHost, insertBefore);
        else shell.appendChild(barHost);
      }
      if (!disposed) setVoiceBarHost(barHost);

      // 3. Chips host — last child (full-width row below)
      let chipsHost = shell.querySelector(".voice-chips-host");
      if (!(chipsHost instanceof HTMLElement)) {
        chipsHost = document.createElement("div");
        chipsHost.className = "voice-chips-host";
        shell.appendChild(chipsHost);
      }
      if (!disposed) setVoiceChipsHost(chipsHost);
    };

    ensureHosts();
    const obs = new MutationObserver(ensureHosts);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      obs.disconnect();
      setVoiceButtonHost(null);
      setVoiceBarHost(null);
      setVoiceChipsHost(null);
    };
  }, []);

  // ── Voice toggle handlers ─────────────────────────────────────────
  const handleOpenVoicePanel = () => {
    setVoicePanelOpen(true);
    setTranscriptText("");
    setInterimText("");
    transcriptRef.current = "";
    interimRef.current = "";
    setTypedPreview("");
    if (micPermissionState === "granted") setVoicePanelStatus(promptText.saySomething);
    else if (micPermissionState === "denied") setVoicePanelStatus("Microphone blocked. Allow mic in browser settings.");
    else setVoicePanelStatus("Tap mic to allow microphone and start listening.");
    void refreshPermission();
  };

  const handleVoiceToggle = () => {
    if (!isSupported || !recognitionRef.current) {
      setVoicePanelOpen(true);
      setVoicePanelStatus(/edg|opr|opera/i.test(navigator.userAgent)
        ? "Edge/Opera support is limited. Try Chrome."
        : "Web Speech API unavailable in this browser.");
      return;
    }
    if (micPromptDismissedRef.current) {
      micPromptDismissedRef.current = false;
      handleOpenVoicePanel();
      setVoicePanelStatus("Retrying microphone permission...");
      void handleSpeakAction();
      return;
    }
    if (voicePanelOpen && !isListening && !isProcessingCmd) { stopAndClosePanel(); return; }
    handleOpenVoicePanel();
    if (isListening) { recognitionRef.current.stop(); return; }
    if (micPermissionState === "denied") { setVoicePanelStatus("Microphone blocked. Allow mic in browser settings."); return; }
    if (micPermissionState !== "granted") { void handleSpeakAction(); return; }
    recognitionRef.current.lang = resetSpeechLangCycle(lang);
    onStatusChange(promptText.listening);
    startRecognition();
  };

  const handleSpeakAction = async () => {
    if (micPromptDismissedRef.current) micPromptDismissedRef.current = false;
    if (isListening) { recognitionRef.current?.stop(); return; }
    if (micPermissionState === "denied") { setVoicePanelStatus("Microphone blocked. Allow mic in browser settings."); return; }
    let ok = micPermissionState === "granted";
    if (!ok) ok = await requestMicPermission();
    if (!ok) return;
    recognitionRef.current.lang = resetSpeechLangCycle(lang);
    onStatusChange(promptText.listening);
    startRecognition();
  };

  const isMicPermissionActionable = !isListening && micPermissionState !== "granted";
  const handleMicPermissionHintClick = async () => {
    if (!isMicPermissionActionable) return;

    if (micPermissionState === "prompt" || micPermissionState === "unknown") {
      await handleSpeakAction();
      return;
    }

    const isSecure =
      typeof window !== "undefined"
      && (window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (!isSecure) {
      setVoicePanelStatus("Microphone blocked on HTTP. Open app on HTTPS URL, then tap mic again.");
      return;
    }
    setVoicePanelStatus("Microphone blocked. Enable mic in browser site settings and tap mic again.");
  };

  // Chip click → run the phrase as if spoken
  const handleChipClick = (phrase) => {
    if (isProcessingRef.current) return;
    setInterimText("");
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    animateTypingThenRunCommand(phrase, CHIP_DIRECT_COMMANDS[phrase] || null);
  };

  // Shuffle examples once on mount so chips appear in a different order every page load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledExamples = useMemo(() => {
    const arr = [...promptText.examples];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []); // intentional empty deps — stable random order for the lifetime of this page load

  // ── Portal content ────────────────────────────────────────────────

  const visibleExamples = useMemo(
    () =>
      shuffledExamples.filter((phrase) => {
        if (CHIP_DIRECT_COMMANDS[phrase]) return true;
        return Boolean(resolveVoiceCommand(phrase));
      }),
    [shuffledExamples],
  );
  const statusBadgeText = isListening
    ? `Listening • ${listenCountdown}s`
    : (isProcessingCmd ? `${Math.max(0, Math.min(100, processingPercent))}% • ${promptText.processingRequest}` : voicePanelStatus);
  const showBusyDot = isListening || isProcessingCmd;

  // Bar content: [badge] [waveform-left] [transcript]
  // Replaces the search input in the same flex row.
  const barContent = voicePanelOpen ? (
    <div className="voice-bar__inner">
      {/* Listening / status badge */}
      <button
        type="button"
        className={`voice-bar__badge${isMicPermissionActionable ? " voice-bar__badge--actionable" : ""}`}
        aria-live="polite"
        onClick={() => { void handleMicPermissionHintClick(); }}
      >
        <span className={`voice-bar__dot${showBusyDot ? " voice-bar__dot--active" : ""}`} />
        <span className="voice-bar__badge-text">
          {statusBadgeText}
        </span>
      </button>

      {/* Left waveform */}
      <div
        className={`voice-bar__meter${isListening ? " voice-bar__meter--active" : ""}${isProcessingCmd ? " voice-bar__meter--processing" : ""}`}
        aria-hidden="true"
      >
        <span /><span /><span /><span /><span /><span /><span />
      </div>

      {/* Live transcript / typed preview — teal color */}
      <div className="voice-bar__transcript" role="status" aria-live="polite">
        {typedPreview || transcriptText || interimText ? (
          <>
            <span className="voice-bar__transcript-text">
              {typedPreview || transcriptText}
            </span>
            {interimText && !typedPreview
              ? <span className="voice-bar__interim"> {interimText}</span>
              : null}
            {isListening && <span className="voice-bar__cursor" aria-hidden="true" />}
          </>
        ) : (
          <span className="voice-bar__placeholder">
            {promptText.saySomething}
          </span>
        )}
      </div>

    </div>
  ) : null;

  // Chips row: full-width scrollable row of suggestion chips
  const chipsContent = voicePanelOpen ? (
    <div className="voice-chips__row" aria-label="Voice command suggestions">
      {visibleExamples.map((phrase) => (
        <button
          key={phrase}
          type="button"
          className="voice-chips__chip"
          onClick={() => handleChipClick(phrase)}
          disabled={isProcessingCmd}
        >
          {CHIP_ICON[phrase] ?? null}
          <span>{phrase}</span>
        </button>
      ))}
    </div>
  ) : null;

  // Mic toggle button (portaled before Search button)
  const voiceButton = (
    <button
      type="button"
      className={`search-shell__submit voice-mic-btn${isListening ? " voice-mic-btn--listening" : ""}`}
      onClick={handleVoiceToggle}
      aria-label={isSupported
        ? (isListening ? "Stop voice command" : "Start voice command")
        : "Voice command not supported"}
      title={isSupported ? "Voice command" : "Voice command not supported in this browser"}
    >
      <span className="voice-mic-btn__ring" aria-hidden="true" />
      {isListening ? <MicOff size={17} /> : <Mic size={17} />}
    </button>
  );

  return (
    <>
      {voiceButtonHost ? createPortal(voiceButton, voiceButtonHost) : voiceButton}
      {barContent   && voiceBarHost   ? createPortal(barContent,   voiceBarHost)   : null}
      {chipsContent && voiceChipsHost ? createPortal(chipsContent, voiceChipsHost) : null}
    </>
  );
}
