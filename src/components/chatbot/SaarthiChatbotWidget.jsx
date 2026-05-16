import { useEffect, useRef, useState } from "react";
import "./SaarthiChatbotWidget.css";

const CHATBOT_LOCALE = {
  en: {
    subtitle: "Assistant + FAQ",
    welcomeMessage: "Welcome! I am EODB Saarthi.\nAsk your question in English or Hinglish.",
    faqTitle: "FAQ Questions (Click to Ask)",
    inputPlaceholder: "Ask in English or Hinglish...",
    questions: [
      "How to search land records?",
      "What fields are required to search?",
      "Khasra number nahi pata, ab kya kare?",
      "Why am I getting no records?",
      "Spelling mismatch kaise thik kare?",
      "Too many results aa rahe hain, refine kaise kare?",
      "Filters reset/clear kaise kare?",
      "Can I search by owner name?",
      "Record details download ya print kaise kare?",
      "Login nahi ho raha, kya kare?",
      "Password bhool gaya, reset kaise kare?",
      "Session expire ho gaya, ab kya kare?",
      "Website ke liye best browser kaunsa hai?",
      "Support se contact kaise kare?",
      "Complaint ke time kaunse details share kare?",
      "Is chatbot me kya-kya puch sakte hain?",
      "Kya main English ya Hinglish me puch sakta hoon?",
      "The map is not loading. What should I do?",
      "I cannot find my village in the dropdown. Why?",
      "Owner name is incorrect. Can I dispute here?",
      "Can I download or save Khasra details?",
      "I am not receiving OTP. What should I do?",
      "Maximum parcels I can select at once?",
      "Can I switch portal language to Hindi?",
      "Is portal data legally valid for transactions?",
      "Which browsers are officially supported?",
      "What is Khasra number?",
      "What is Muraba/Murabba?",
      "District, Tehsil, Village me kya difference hai?",
      "What is Murabba and how is it different from Khasra?",
    ],
  },
  hi: {
    subtitle: "सहायक + FAQ",
    welcomeMessage: "स्वागत है! मैं EODB Saarthi हूँ।\nअपना सवाल English या Hinglish में पूछें।",
    faqTitle: "FAQ सवाल (पूछने के लिए क्लिक करें)",
    inputPlaceholder: "English या Hinglish में पूछें...",
    questions: [
      "भूमि रिकॉर्ड कैसे खोजें?",
      "खोज के लिए कौन-कौन से फ़ील्ड जरूरी हैं?",
      "अगर खसरा नंबर नहीं पता हो तो क्या करें?",
      "रिकॉर्ड नहीं मिल रहे, क्यों?",
      "स्पेलिंग mismatch कैसे ठीक करें?",
      "बहुत ज़्यादा results आ रहे हैं, refine कैसे करें?",
      "Filters reset/clear कैसे करें?",
      "क्या मैं owner name से search कर सकता/सकती हूँ?",
      "रिकॉर्ड details download या print कैसे करें?",
      "लॉगिन नहीं हो रहा, क्या करें?",
      "पासवर्ड भूल गया/गई, reset कैसे करें?",
      "Session expire हो गया, अब क्या करें?",
      "वेबसाइट के लिए best browser कौन सा है?",
      "Support से contact कैसे करें?",
      "Complaint के समय कौन-सी details share करें?",
      "इस chatbot में क्या-क्या पूछ सकते हैं?",
      "क्या मैं English या Hinglish में पूछ सकता/सकती हूँ?",
      "Map load नहीं हो रहा, क्या करें?",
      "Dropdown में village नहीं मिल रहा, क्यों?",
      "Owner name गलत है, क्या यहाँ dispute कर सकते हैं?",
      "क्या मैं Khasra details download या save कर सकता/सकती हूँ?",
      "OTP नहीं मिल रहा, क्या करें?",
      "एक बार में maximum कितने parcels select कर सकते हैं?",
      "क्या portal language Hindi में switch कर सकते हैं?",
      "क्या portal data transactions के लिए legally valid है?",
      "Officially supported browsers कौन-से हैं?",
      "खसरा नंबर क्या होता है?",
      "मुरब्बा क्या होता है?",
      "District, Tehsil, Village में क्या अंतर है?",
      "Murabba और Khasra में क्या फर्क है?",
    ],
  },
};

const LANGUAGE_SUPPORT_QUESTION = "Which language types are supported for search?";
const LANGUAGE_SUPPORT_TEXT = "I support English, Hinglish, Hindi.";
const VOICE_SEARCH_HELP_QUESTION = "How to use voice search?";
const VOICE_SEARCH_HELP_TEXT = `Voice search steps:
1. Click the voice icon.
2. Speak your full query in one line.
3. Your spoken query appears in chatbot and search runs.`;
const CADASTRAL_LAYER_QUESTION = "When does cadastral layer appear?";
const CADASTRAL_LAYER_ANSWER = "Cadastral layer is shown after map zoom reaches 1:5000.";
const OWNER_SEARCH_HELP_TEXT = `Live Owner Search enabled.
Type your full query in one line and press send.
Example (English/Hinglish):
district Karnal tehsil Nilokheri village Narayan murabba 51 khasra 18`;

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createInjectedId() {
  return `saarthi-inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeText(value, fallback = "N/A") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function getByPath(source, path) {
  if (!source || typeof source !== "object") return undefined;
  const parts = String(path || "").split(".");
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function pickFirstValue(source, keys) {
  for (const key of keys) {
    const value = key.includes(".") ? getByPath(source, key) : source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function unwrapOwnerPayload(payload) {
  let value = payload;
  for (let i = 0; i < 5; i += 1) {
    if (Array.isArray(value) && value.length > 0) {
      value = value[0];
      continue;
    }
    if (!value || typeof value !== "object") break;
    const nested = value.data ?? value.result ?? value.payload ?? value.response;
    if (nested && nested !== value) {
      value = nested;
      continue;
    }
    break;
  }
  return value || {};
}

function toMatchLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (value === true || value === 1 || normalized === "true" || normalized === "yes" || normalized === "y" || normalized === "matched") {
    return "Yes";
  }
  if (value === false || value === 0 || normalized === "false" || normalized === "no" || normalized === "n" || normalized === "not matched") {
    return "No";
  }
  return safeText(value);
}

function toCount(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatOwnerApiResult(rawPayload) {
  const payload = unwrapOwnerPayload(rawPayload);
  const ownerPrimary = pickFirstValue(payload, [
    "owner",
    "ownerName",
    "owner_name",
    "farmerName",
    "name",
  ]);
  const owners = Array.isArray(payload?.owners) ? payload.owners.filter(Boolean) : [];
  const ownerName = ownerPrimary || (owners.length ? owners[0] : "");
  const moreCoOwners = Math.max(
    toCount(
      pickFirstValue(payload, [
        "moreCoOwners",
        "more_co_owners",
        "coOwnersCount",
        "co_owners_count",
        "additionalCoOwners",
        "additional_co_owners",
      ]),
    ),
    owners.length > 1 ? owners.length - 1 : 0,
  );

  const lines = [
    "Owner Details (Live API)",
    `District: ${safeText(pickFirstValue(payload, ["district", "districtName", "district_name"]))}`,
    `Tehsil: ${safeText(pickFirstValue(payload, ["tehsil", "tehsilName", "tehsil_name"]))}`,
    `Village: ${safeText(pickFirstValue(payload, ["village", "villageName", "village_name"]))}`,
    `Murabba: ${safeText(pickFirstValue(payload, ["murabba", "murabbaNo", "murabba_no", "muraba", "murabaNo"]))}`,
    `Khasra: ${safeText(pickFirstValue(payload, ["khasra", "khasraNo", "khasra_no"]))}`,
    `Owner: ${safeText(ownerName)}`,
    `Share: ${safeText(pickFirstValue(payload, ["share", "ownerShare", "ownershipShare", "owner_share"]))}`,
    `Land Match: ${toMatchLabel(pickFirstValue(payload, ["landMatch", "land_match"]))}`,
    `Farmer Match: ${toMatchLabel(pickFirstValue(payload, ["farmerMatch", "farmer_match"]))}`,
  ];

  if (moreCoOwners > 0) {
    lines.push(`More co-owners: ${moreCoOwners}`);
  }

  return lines.join("\n");
}

function resolveOwnerExtractor(frameWindow) {
  const candidates = [
    frameWindow?.extractLandRecordFromSpeech,
    frameWindow?.parent?.extractLandRecordFromSpeech,
    window?.extractLandRecordFromSpeech,
  ];
  const extractor = candidates.find((candidate) => typeof candidate === "function");
  if (!extractor) {
    throw new Error("extractLandRecordFromSpeech is not available.");
  }
  return extractor;
}

function resolveWebsiteFaqQuery(localeQuestions, fallbackQueries, containsTokens = []) {
  const questions = Array.isArray(localeQuestions) ? localeQuestions.filter(Boolean) : [];
  const normalizedQuestions = questions.map((question) => ({
    raw: question,
    norm: normalizeText(question),
  }));

  for (const fallback of fallbackQueries) {
    const exact = normalizedQuestions.find((entry) => entry.norm === normalizeText(fallback));
    if (exact) return exact.raw;
  }

  if (containsTokens.length) {
    const normalizedTokens = containsTokens.map((token) => normalizeText(token));
    const fuzzy = normalizedQuestions.find((entry) => (
      normalizedTokens.every((token) => entry.norm.includes(token))
    ));
    if (fuzzy) return fuzzy.raw;
  }

  return fallbackQueries[0] || "";
}

function makeMenuConfig(localeQuestions) {
  const faqQuestions = Array.isArray(localeQuestions) ? localeQuestions.slice(0, 6) : [];
  const faqOptions = faqQuestions.map((question, index) => ({
    label: `${index + 1} ${question}`,
    action: "ask",
    query: question,
  }));

  const mappedQueries = {
    requiredFields: resolveWebsiteFaqQuery(
      localeQuestions,
      ["What fields are required to search?"],
      ["required", "search"],
    ),
    ownerName: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Can I search by owner name?"],
      ["owner", "search"],
    ),
    searchLandRecords: resolveWebsiteFaqQuery(
      localeQuestions,
      ["How to search land records?"],
      ["search", "land", "record"],
    ),
    noRecords: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Why am I getting no records?"],
      ["no", "record"],
    ),
    mapNotLoading: resolveWebsiteFaqQuery(
      localeQuestions,
      ["The map is not loading. What should I do?"],
      ["map", "loading"],
    ),
    refineResults: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Too many results aa rahe hain, refine kaise kare?"],
      ["too", "many", "result"],
    ),
    printRecord: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Record details download ya print kaise kare?"],
      ["print", "record"],
    ),
    downloadDetails: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Can I download or save Khasra details?"],
      ["download", "khasra"],
    ),
    loginIssue: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Login nahi ho raha, kya kare?"],
      ["login"],
    ),
    otpIssue: resolveWebsiteFaqQuery(
      localeQuestions,
      ["I am not receiving OTP. What should I do?"],
      ["otp"],
    ),
    passwordReset: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Password bhool gaya, reset kaise kare?"],
      ["password", "reset"],
    ),
    sessionExpired: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Session expire ho gaya, ab kya kare?"],
      ["session", "expire"],
    ),
    khasraMeaning: resolveWebsiteFaqQuery(
      localeQuestions,
      ["What is Khasra number?"],
      ["khasra"],
    ),
    murabbaMeaning: resolveWebsiteFaqQuery(
      localeQuestions,
      ["What is Muraba/Murabba?"],
      ["murabba"],
    ),
    districtTehsilVillage: resolveWebsiteFaqQuery(
      localeQuestions,
      ["District, Tehsil, Village me kya difference hai?"],
      ["district", "tehsil", "village"],
    ),
    legalValidity: resolveWebsiteFaqQuery(
      localeQuestions,
      ["Is portal data legally valid for transactions?"],
      ["legal", "valid"],
    ),
  };

  return {
    main: {
      title: "Main Menu",
      options: [
        { label: "1 Search Land Record", action: "menu", target: "search-land-record" },
        { label: "2 Map & Parcel Help", action: "menu", target: "map-parcel-help" },
        { label: "3 Print / Download Help", action: "menu", target: "print-download-help" },
        { label: "4 Login / OTP / Password Help", action: "menu", target: "login-otp-password-help" },
        { label: "5 Portal Terms", action: "menu", target: "portal-terms" },
        { label: "6 FAQ", action: "menu", target: "faq" },
      ],
    },
    "search-land-record": {
      title: "Search Land Record",
      options: [
        { label: "1 Search by District/Tehsil/Village/Khasra", action: "ask", query: mappedQueries.requiredFields },
        { label: "2 Search by Owner Name", action: "ask", query: mappedQueries.ownerName },
        { label: "3 Voice Search Help", action: "voice-help", query: VOICE_SEARCH_HELP_QUESTION },
        { label: "4 Owner details (Live API)", action: "owner-api", query: mappedQueries.ownerName },
        { label: "5 What languages are supported?", action: "language-help", query: LANGUAGE_SUPPORT_QUESTION },
        { label: "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "map-parcel-help": {
      title: "Map & Parcel Help",
      options: [
        { label: "1 How to select parcel on map", action: "ask", query: mappedQueries.searchLandRecords },
        { label: "2 Why parcel not highlighted", action: "ask", query: mappedQueries.noRecords },
        { label: "3 Map zoom / layer help", action: "ask", query: mappedQueries.mapNotLoading },
        { label: "4 Service linked meaning", action: "ask", query: mappedQueries.refineResults },
        { label: "5 When does cadastral layer appear?", action: "cadastral-help", query: CADASTRAL_LAYER_QUESTION },
        { label: "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "print-download-help": {
      title: "Print / Download Help",
      options: [
        { label: "1 Print current record", action: "ask", query: mappedQueries.printRecord },
        { label: "2 Download details", action: "ask", query: mappedQueries.downloadDetails },
        { label: "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "login-otp-password-help": {
      title: "Login / OTP / Password Help",
      options: [
        { label: "1 Login issue", action: "ask", query: mappedQueries.loginIssue },
        { label: "2 OTP not received", action: "ask", query: mappedQueries.otpIssue },
        { label: "3 Password reset", action: "ask", query: mappedQueries.passwordReset },
        { label: "4 Session expired", action: "ask", query: mappedQueries.sessionExpired },
        { label: "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "portal-terms": {
      title: "Portal Terms",
      options: [
        { label: "1 What is Khasra", action: "ask", query: mappedQueries.khasraMeaning },
        { label: "2 What is Murabba", action: "ask", query: mappedQueries.murabbaMeaning },
        { label: "3 District/Tehsil/Village difference", action: "ask", query: mappedQueries.districtTehsilVillage },
        { label: "4 Portal legal validity note", action: "ask", query: mappedQueries.legalValidity },
        { label: "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    faq: {
      title: "FAQ",
      options: [
        ...faqOptions,
        { label: "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
  };
}

function createMessageRow(frameDoc, message, iconUrl) {
  const row = frameDoc.createElement("div");
  row.className = `message-row ${message.sender === "user" ? "user-row" : "bot-row"} saarthi-menu-qa-row`;
  row.dataset.saarthiSource = "inline-menu";
  row.dataset.inlineMessageId = message.id;

  if (message.sender === "bot") {
    const botAvatar = frameDoc.createElement("div");
    botAvatar.className = "avatar bot-avatar-img";
    const img = frameDoc.createElement("img");
    img.src = iconUrl;
    img.alt = "EODB Saarthi";
    botAvatar.appendChild(img);
    row.appendChild(botAvatar);
  }

  const messageGroup = frameDoc.createElement("div");
  messageGroup.className = "message-group";

  const bubble = frameDoc.createElement("div");
  bubble.className = `message-bubble ${message.sender}`;
  bubble.textContent = message.text;
  messageGroup.appendChild(bubble);

  const time = frameDoc.createElement("div");
  time.className = `message-time ${message.sender === "user" ? "user-time" : "bot-time"}`;
  time.textContent = message.time || getCurrentTimeLabel();
  messageGroup.appendChild(time);

  row.appendChild(messageGroup);

  if (message.sender === "user") {
    const userAvatar = frameDoc.createElement("div");
    userAvatar.className = "avatar user-avatar";
    userAvatar.textContent = "U";
    row.appendChild(userAvatar);
  }

  return row;
}

function renderInjectedMessages(frameDoc, session, iconUrl) {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;

  chatContainer.querySelectorAll(".saarthi-menu-qa-row").forEach((node) => node.remove());

  if (!Array.isArray(session.injectedMessages) || !session.injectedMessages.length) {
    return;
  }

  const typingRow = chatContainer.querySelector(".typing-bubble")?.closest(".message-row");
  session.injectedMessages.forEach((message) => {
    const row = createMessageRow(frameDoc, message, iconUrl);
    if (typingRow && typingRow.parentElement === chatContainer) {
      chatContainer.insertBefore(row, typingRow);
    } else {
      chatContainer.appendChild(row);
    }
  });
}

function scrollChatToBottom(frameDoc) {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function pushInlineMessage(session, sender, text) {
  if (!session.injectedMessages) session.injectedMessages = [];
  session.injectedMessages.push({
    id: createInjectedId(),
    sender,
    text,
    time: getCurrentTimeLabel(),
  });
}

function upsertOwnerStatus(frameDoc, session) {
  const menuRoot = frameDoc.querySelector(".saarthi-inline-menu");
  if (!menuRoot) return;

  let statusNode = menuRoot.querySelector(".saarthi-inline-status");
  if (!session.ownerApiMode) {
    statusNode?.remove();
    return;
  }

  if (!statusNode) {
    statusNode = frameDoc.createElement("div");
    statusNode.className = "saarthi-inline-status";
    menuRoot.appendChild(statusNode);
  }

  statusNode.textContent = session.ownerApiBusy
    ? "Live Owner Search mode is active (processing...)."
    : "Live Owner Search mode is active.";
}

function renderInlineMenu(frameDoc, session, localeQuestions) {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;

  const menuConfig = makeMenuConfig(localeQuestions);
  const activeMenu = menuConfig[session.menuState] || menuConfig.main;

  let menuNode = frameDoc.querySelector(".saarthi-inline-menu");
  if (!menuNode) {
    menuNode = frameDoc.createElement("section");
    menuNode.className = "saarthi-inline-menu";
  }

  const existingHeader = menuNode.querySelector(".saarthi-inline-menu__title");
  if (existingHeader) {
    existingHeader.textContent = activeMenu.title;
  } else {
    const titleNode = frameDoc.createElement("div");
    titleNode.className = "saarthi-inline-menu__title";
    titleNode.textContent = activeMenu.title;
    menuNode.appendChild(titleNode);
  }

  let optionsNode = menuNode.querySelector(".saarthi-inline-menu__options");
  if (!optionsNode) {
    optionsNode = frameDoc.createElement("div");
    optionsNode.className = "saarthi-inline-menu__options";
    menuNode.appendChild(optionsNode);
  }

  optionsNode.innerHTML = "";
  activeMenu.options.forEach((option) => {
    const button = frameDoc.createElement("button");
    button.type = "button";
    button.className = "saarthi-inline-menu__option";
    button.textContent = option.label;
    button.dataset.action = option.action || "";
    button.dataset.target = option.target || "";
    button.dataset.query = option.query || "";
    optionsNode.appendChild(button);
  });

  const firstMessageNode = chatContainer.querySelector(".message-row");
  if (firstMessageNode) {
    chatContainer.insertBefore(menuNode, firstMessageNode);
  } else if (chatContainer.firstChild !== menuNode) {
    chatContainer.insertBefore(menuNode, chatContainer.firstChild);
  }

  upsertOwnerStatus(frameDoc, session);
}

function ensureJumpToMenuButton(frameDoc, session) {
  const chatBox = frameDoc.querySelector(".chat-box");
  const chatContainer = frameDoc.querySelector(".chat-container");
  const menuNode = frameDoc.querySelector(".saarthi-inline-menu");
  if (!(chatBox && chatContainer && menuNode)) return;

  let jumpButton = frameDoc.querySelector(".saarthi-inline-menu__jump");
  if (!jumpButton) {
    jumpButton = frameDoc.createElement("button");
    jumpButton.type = "button";
    jumpButton.className = "saarthi-inline-menu__jump";
    jumpButton.textContent = "Jump to Menu";
    chatBox.appendChild(jumpButton);
  } else if (jumpButton.parentElement !== chatBox) {
    chatBox.appendChild(jumpButton);
  }

  jumpButton.onclick = () => {
    menuNode.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateVisibility = () => {
    const inputAreaNode = frameDoc.querySelector(".input-area");
    const inputHeight = Math.ceil(inputAreaNode?.getBoundingClientRect?.().height || 62);
    jumpButton.style.bottom = `${Math.max(6, inputHeight - 6)}px`;
    jumpButton.style.display = chatContainer.scrollTop > 120 ? "inline-flex" : "none";
  };

  if (session.jumpContainer !== chatContainer) {
    if (session.jumpContainer && session.onJumpScroll) {
      session.jumpContainer.removeEventListener("scroll", session.onJumpScroll);
    }
    session.jumpContainer = chatContainer;
    session.onJumpScroll = updateVisibility;
    chatContainer.addEventListener("scroll", updateVisibility, { passive: true });
  }

  updateVisibility();
}

function buildInlineRenderKey(lang, session) {
  const injectedMessages = Array.isArray(session?.injectedMessages) ? session.injectedMessages : [];
  const messageSignature = injectedMessages
    .map((message) => `${message.id}:${message.sender}:${message.text}`)
    .join("|");
  return [
    lang,
    session?.menuState || "main",
    session?.ownerApiMode ? "1" : "0",
    session?.ownerApiBusy ? "1" : "0",
    messageSignature,
  ].join("::");
}

function resetInlineMenuSession(frameDoc, session, localeQuestions, iconUrl) {
  session.ownerApiMode = false;
  session.ownerApiBusy = false;
  session.menuState = "main";
  session.injectedMessages = [];
  session.bypassOwnerModeOnce = false;
  session.askLockKey = "";
  session.askLockUntil = 0;
  session.lastInlineRenderKey = "";
  if (session.pendingAskTimer) {
    clearTimeout(session.pendingAskTimer);
    session.pendingAskTimer = null;
  }
  if (session.clearResetTimer) {
    clearTimeout(session.clearResetTimer);
    session.clearResetTimer = null;
  }

  frameDoc.querySelector(".saarthi-inline-status")?.remove();
  frameDoc.querySelectorAll(".saarthi-menu-qa-row").forEach((row) => row.remove());

  renderInlineMenu(frameDoc, session, localeQuestions);
  renderInjectedMessages(frameDoc, session, iconUrl);
  ensureJumpToMenuButton(frameDoc, session);
}

function clearChatHistoryRows(frameDoc) {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;
  const rows = Array.from(chatContainer.querySelectorAll(".message-row"));
  if (!rows.length) return;

  const isWelcomeRow = (row) => {
    const text = normalizeText(row.querySelector(".message-bubble")?.textContent || "");
    return (
      (text.includes("welcome") && text.includes("eodb saarthi"))
      || (text.includes("saarthi") && text.includes("ask your question"))
    );
  };

  const keepRow = rows.find((row) => isWelcomeRow(row)) || rows[0];
  rows.forEach((row) => {
    if (row !== keepRow) {
      row.remove();
    }
  });
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function readToken(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function buildBridgeStyles({
  surface,
  surfaceStrong,
  bgSecondary,
  ink,
  inkSoft,
  border,
  shadowSoft,
  green,
  mint,
}) {
  const gradient = `linear-gradient(135deg, ${green}, ${mint})`;

  return `
html, body, #root {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}
body {
  overflow: hidden;
}
.app {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
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
  right: 14px !important;
  bottom: 8px !important;
  gap: 6px !important;
  background: transparent !important;
  background-color: transparent !important;
}
.app.dark .floating-wrapper {
  background: transparent !important;
  background-color: transparent !important;
}
.notify-dot {
  background: #17b26a !important;
  border: 1px solid rgba(15, 23, 42, 0.18) !important;
  box-shadow: none !important;
}
.helper-bubble {
  display: none !important;
}
.app.dark .helper-bubble {
  display: none !important;
}
.floating-btn {
  width: 52px !important;
  height: 52px !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 50% !important;
  background: transparent !important;
  background-color: transparent !important;
  color: ${green} !important;
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: visible !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.app.dark .floating-btn {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.floating-btn > svg,
.floating-btn > i {
  display: none !important;
}
.floating-btn::before {
  content: "" !important;
  position: absolute !important;
  inset: -6px !important;
  border-radius: 50% !important;
  border: 3px solid currentColor !important;
  background: transparent !important;
  opacity: 0.64 !important;
  animation: saarthiPulse 1.95s ease-out infinite !important;
  pointer-events: none !important;
}
.floating-btn::after {
  content: "" !important;
  position: absolute !important;
  inset: -2px !important;
  border-radius: 50% !important;
  border: 2px solid currentColor !important;
  background: transparent !important;
  opacity: 0.42 !important;
  box-shadow: 0 0 0 2px rgba(47, 141, 93, 0.16) !important;
  pointer-events: none !important;
}
.floating-btn:hover,
.floating-btn:focus-visible {
  transform: none !important;
  box-shadow: none !important;
}
.ping-ring {
  display: none !important;
}
.floating-bot-img {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  overflow: hidden !important;
  background: transparent !important;
}
.app.dark .floating-bot-img {
  background: transparent !important;
}
.floating-bot-img img,
.bot-logo-img img {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  object-fit: contain !important;
  object-position: center center !important;
  transform: scale(0.98) !important;
  transform-origin: center center !important;
  background: transparent !important;
  display: block !important;
}
.chat-box {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  max-height: none !important;
  margin: 0 !important;
  border-radius: 14px !important;
}
.chat-container {
  padding: 8px !important;
}
.saarthi-inline-menu {
  margin: 2px 0 10px !important;
  padding: 8px !important;
  border: 1px solid rgba(21, 128, 61, 0.24) !important;
  border-radius: 12px !important;
  background: rgba(240, 253, 244, 0.88) !important;
  pointer-events: auto !important;
}
.app.dark .saarthi-inline-menu {
  background: rgba(15, 23, 42, 0.72) !important;
  border-color: rgba(167, 243, 208, 0.28) !important;
}
.saarthi-inline-menu__title {
  font-size: 12px !important;
  font-weight: 800 !important;
  color: var(--text-main) !important;
  margin-bottom: 6px !important;
}
.saarthi-inline-menu__options {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  pointer-events: auto !important;
}
.saarthi-inline-menu__option {
  border: 1px solid rgba(21, 128, 61, 0.24) !important;
  background: #ffffff !important;
  color: #14532d !important;
  border-radius: 10px !important;
  padding: 7px 9px !important;
  text-align: left !important;
  font-size: 11.5px !important;
  line-height: 1.35 !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  touch-action: manipulation !important;
  -webkit-tap-highlight-color: transparent !important;
}
.app.dark .saarthi-inline-menu__option {
  background: rgba(15, 23, 42, 0.82) !important;
  color: #dcfce7 !important;
}
.saarthi-inline-menu__option:hover {
  transform: translateY(-1px) !important;
}
.saarthi-inline-status {
  margin-top: 7px !important;
  border-left: 3px solid #15803d !important;
  padding: 5px 7px !important;
  background: rgba(22, 101, 52, 0.08) !important;
  border-radius: 6px !important;
  font-size: 11px !important;
  color: var(--text-main) !important;
}
.saarthi-inline-menu__jump {
  position: absolute !important;
  right: 84px !important;
  bottom: 78px !important;
  z-index: 4 !important;
  border: none !important;
  border-radius: 999px !important;
  padding: 7px 10px !important;
  font-size: 10.5px !important;
  line-height: 1.2 !important;
  font-weight: 800 !important;
  display: none;
  align-items: center !important;
  color: #fff !important;
  background: linear-gradient(135deg, #166534, #0f766e) !important;
  box-shadow: 0 8px 18px rgba(20, 184, 166, 0.24) !important;
  cursor: pointer !important;
  max-width: 120px !important;
  transform: translateY(2px) !important;
}
.message-bubble {
  font-size: 11.5px !important;
}
.header-text p {
  display: block !important;
  opacity: 1 !important;
}
.faq-suggestions-panel {
  display: none !important;
}
.faq-suggestions-list {
  max-height: 68px !important;
}
@keyframes saarthiPulse {
  0% {
    transform: scale(0.92);
    opacity: 0.66;
  }
  70% {
    transform: scale(1.27);
    opacity: 0;
  }
  100% {
    transform: scale(1.27);
    opacity: 0;
  }
}
@media (max-width: 640px) {
  .floating-btn {
    width: 46px !important;
    height: 46px !important;
  }
  .chat-box {
    border-radius: 11px !important;
  }
}
`;
}

export default function SaarthiChatbotWidget({ lang = "en", blurred = false, hidden = false }) {
  const iframeRef = useRef(null);
  const observerRef = useRef(null);
  const layoutObserverRef = useRef(null);
  const hostLayoutObserverRef = useRef(null);
  const syncSchedulerRef = useRef({
    pending: false,
    timer: null,
    destroyed: false,
    lastRunAt: 0,
  });
  const menuSessionRef = useRef({
    menuState: "main",
    ownerApiMode: false,
    ownerApiBusy: false,
    injectedMessages: [],
    bypassOwnerModeOnce: false,
    jumpContainer: null,
    onJumpScroll: null,
    boundDoc: null,
    docCleanup: null,
    lastInlineRenderKey: "",
    pendingAskTimer: null,
    clearResetTimer: null,
    askLockKey: "",
    askLockUntil: 0,
    lastMenuDispatchKey: "",
    lastMenuDispatchAt: 0,
    menuActionHandler: null,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(28);
  const chatbotCssPath = `${import.meta.env.BASE_URL}chatbot/assets/index-CleebXl6.css`;
  const chatbotJsPath = `${import.meta.env.BASE_URL}chatbot/assets/index-h95SWGsY.js`;
  const chatbotIconPath = `${import.meta.env.BASE_URL}chatbot/assets/eodb-saarthi-_EV4f2aO.png`;
  const activeLocale = CHATBOT_LOCALE[lang] || CHATBOT_LOCALE.en;

  const closeBottomPanelIfOpen = () => {
    const tableOpen = Boolean(document.querySelector(".map-stage__viewport--table-open"));
    if (!tableOpen) return false;
    const toggleButton = document.querySelector(".parcel-table-toggle");
    if (toggleButton && typeof toggleButton.click === "function") {
      toggleButton.click();
      return true;
    }
    return false;
  };

  const openChatFromHost = () => {
    const panelWasOpen = closeBottomPanelIfOpen();
    const frameDoc = iframeRef.current?.contentDocument;
    const floatingButton = frameDoc?.querySelector(".floating-btn");
    if (!(floatingButton && typeof floatingButton.click === "function")) return;
    if (panelWasOpen) {
      window.setTimeout(() => floatingButton.click(), 100);
      return;
    }
    floatingButton.click();
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    syncSchedulerRef.current.destroyed = false;
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

    const runAskQuery = (frameDoc, session, query) => {
      const inputNode = frameDoc.querySelector(".input-area input");
      const queryText = String(query || "").trim();
      if (!(inputNode && queryText)) return;

      if (session.pendingAskTimer) {
        clearTimeout(session.pendingAskTimer);
        session.pendingAskTimer = null;
      }
      if (session.clearResetTimer) {
        clearTimeout(session.clearResetTimer);
        session.clearResetTimer = null;
      }

      const normalizedQuery = normalizeText(queryText);
      const getUserRows = () => (
        Array.from(frameDoc.querySelectorAll(".chat-container .message-row.user-row"))
          .filter((row) => !row.classList.contains("saarthi-menu-qa-row"))
      );
      const initialUserCount = getUserRows().length;

      const wasQueryPosted = () => {
        const rows = getUserRows();
        if (rows.length <= initialUserCount) return false;
        const latestRow = rows[rows.length - 1];
        const bubble = latestRow?.querySelector(".message-bubble.user");
        const text = normalizeText(bubble?.textContent || "");
        return text === normalizedQuery;
      };

      const getSendButton = () => {
        const buttons = Array.from(frameDoc.querySelectorAll(".input-area button"));
        if (!buttons.length) return null;
        const submitButton = buttons.find((button) => String(button.getAttribute("type") || "").toLowerCase() === "submit");
        if (submitButton) return submitButton;
        const labeledButton = buttons.find((button) => {
          const hint = normalizeText(
            button.getAttribute("aria-label")
            || button.getAttribute("title")
            || button.getAttribute("name")
            || "",
          );
          return hint.includes("send") || hint.includes("submit") || hint.includes("ask");
        });
        return labeledButton || buttons[buttons.length - 1];
      };

      const attemptSend = (remainingTries = 30) => {
        if (!inputNode.isConnected) return;
        if (wasQueryPosted()) return;

        const sendButton = getSendButton();
        if (sendButton && sendButton.disabled) {
          if (remainingTries <= 0) return;
          session.pendingAskTimer = window.setTimeout(() => attemptSend(remainingTries - 1), 120);
          return;
        }

        inputNode.focus();
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (typeof nativeValueSetter === "function") {
          nativeValueSetter.call(inputNode, queryText);
        } else {
          inputNode.value = queryText;
        }
        inputNode.dispatchEvent(new Event("input", { bubbles: true }));
        inputNode.dispatchEvent(new Event("change", { bubbles: true }));

        // Give React state one tick to sync before triggering send.
        session.pendingAskTimer = window.setTimeout(() => {
          if (!inputNode.isConnected) return;
          if (wasQueryPosted()) return;

          session.bypassOwnerModeOnce = true;
          const form = inputNode.closest("form");
          if (form && typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else if (form) {
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          } else {
            const sendButtonNode = getSendButton();
            if (sendButtonNode && !sendButtonNode.disabled) {
              sendButtonNode.click();
            } else {
              const enterEventInit = {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
              };
              inputNode.dispatchEvent(new KeyboardEvent("keydown", enterEventInit));
              inputNode.dispatchEvent(new KeyboardEvent("keypress", enterEventInit));
              inputNode.dispatchEvent(new KeyboardEvent("keyup", enterEventInit));
            }
          }
          window.setTimeout(() => {
            session.bypassOwnerModeOnce = false;
            const pendingInput = normalizeText(inputNode.value || "");
            const shouldRetry =
              !wasQueryPosted()
              && pendingInput === normalizedQuery
              && remainingTries > 0;
            if (shouldRetry) {
              attemptSend(remainingTries - 1);
            }
          }, 420);
        }, 40);
      };

      attemptSend();
    };

    const addSpecialQAPair = (frameDoc, session, question, answer) => {
      pushInlineMessage(session, "user", question);
      pushInlineMessage(session, "bot", answer);
      renderInjectedMessages(frameDoc, session, iconUrl);
      scrollChatToBottom(frameDoc);
    };

    const handleOwnerApiSubmit = async (frameDoc, session) => {
      if (!session.ownerApiMode || session.ownerApiBusy) return;
      const inputNode = frameDoc.querySelector(".input-area input");
      if (!inputNode) return;
      const query = String(inputNode.value || "").trim();
      if (!query) return;

      inputNode.value = "";
      inputNode.dispatchEvent(new Event("input", { bubbles: true }));

      pushInlineMessage(session, "user", query);
      const loadingMessageId = createInjectedId();
      session.injectedMessages.push({
        id: loadingMessageId,
        sender: "bot",
        text: "Processing Live API request...",
        time: getCurrentTimeLabel(),
      });
      session.ownerApiBusy = true;

      upsertOwnerStatus(frameDoc, session);
      renderInjectedMessages(frameDoc, session, iconUrl);
      session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
      scrollChatToBottom(frameDoc);

      try {
        const extractor = resolveOwnerExtractor(iframe.contentWindow);
        const response = await Promise.resolve(extractor(query));
        const resultText = formatOwnerApiResult(response);
        session.injectedMessages = session.injectedMessages.map((message) => (
          message.id === loadingMessageId
            ? { ...message, text: resultText }
            : message
        ));
      } catch (error) {
        const errorMessage = safeText(error?.message || error, "Unexpected error.");
        session.injectedMessages = session.injectedMessages.map((message) => (
          message.id === loadingMessageId
            ? { ...message, text: `Owner details request failed.\n${errorMessage}` }
            : message
        ));
      } finally {
        session.ownerApiBusy = false;
        upsertOwnerStatus(frameDoc, session);
        renderInjectedMessages(frameDoc, session, iconUrl);
        session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
        scrollChatToBottom(frameDoc);
      }
    };

    const installFrameHandlers = (frameDoc) => {
      const session = menuSessionRef.current;
      if (session.boundDoc === frameDoc) return;

      if (session.docCleanup) {
        session.docCleanup();
        session.docCleanup = null;
      }

      const frameWindow = frameDoc.defaultView || iframe.contentWindow || window;
      const FrameElement = frameWindow.Element || Element;
      const FrameHTMLElement = frameWindow.HTMLElement || HTMLElement;
      const isFrameElement = (node) => node instanceof FrameElement;
      const isFrameHTMLElement = (node) => node instanceof FrameHTMLElement;

      const getTargetElement = (event) => {
        const target = event.target;
        if (isFrameElement(target)) return target;
        if (target && typeof target === "object" && "parentElement" in target) {
          return target.parentElement;
        }
        return null;
      };

      const shouldSkipDuplicateMenuDispatch = (dispatchKey) => {
        const now = Date.now();
        const isDuplicate = (
          session.lastMenuDispatchKey === dispatchKey
          && (now - session.lastMenuDispatchAt) < 320
        );
        session.lastMenuDispatchKey = dispatchKey;
        session.lastMenuDispatchAt = now;
        return isDuplicate;
      };

      const handleMenuAction = (action, targetMenu, query, event) => {
        const dispatchKey = `${action}|${targetMenu}|${query}`;
        if (shouldSkipDuplicateMenuDispatch(dispatchKey)) {
          event.preventDefault();
          event.stopPropagation();
          return true;
        }

        if (action === "menu") {
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          session.menuState = targetMenu || "main";
        } else if (action === "ask") {
          const now = Date.now();
          const askKey = normalizeText(query || "");
          if (askKey && session.askLockKey === askKey && now < session.askLockUntil) {
            event.preventDefault();
            event.stopPropagation();
            return true;
          }
          session.askLockKey = askKey;
          session.askLockUntil = now + 1800;
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          runAskQuery(frameDoc, session, query);
        } else if (action === "language-help") {
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          addSpecialQAPair(frameDoc, session, LANGUAGE_SUPPORT_QUESTION, LANGUAGE_SUPPORT_TEXT);
        } else if (action === "voice-help") {
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          addSpecialQAPair(frameDoc, session, VOICE_SEARCH_HELP_QUESTION, VOICE_SEARCH_HELP_TEXT);
        } else if (action === "cadastral-help") {
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          addSpecialQAPair(frameDoc, session, CADASTRAL_LAYER_QUESTION, CADASTRAL_LAYER_ANSWER);
        } else if (action === "owner-api") {
          session.ownerApiMode = true;
          session.ownerApiBusy = false;
          addSpecialQAPair(frameDoc, session, query || "Can I search by owner name?", OWNER_SEARCH_HELP_TEXT);
        }

        renderInlineMenu(frameDoc, session, activeLocale.questions);
        ensureJumpToMenuButton(frameDoc, session);
        session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
        event.preventDefault();
        event.stopPropagation();
        return true;
      };

      const handleMenuSelection = (menuButton, event) => {
        const action = menuButton.dataset.action || "";
        const targetMenu = menuButton.dataset.target || "";
        const query = menuButton.dataset.query || "";
        return handleMenuAction(action, targetMenu, query, event);
      };

      session.menuActionHandler = handleMenuAction;

      const isClearChatAction = (target) => {
        if (!isFrameElement(target)) return false;
        const button = target.closest(".chat-box .header-actions .icon-btn, .chat-box .header-actions button, .chat-box [data-action='clear-chat']");
        if (!isFrameHTMLElement(button)) return false;

        const titleText = normalizeText(
          button.getAttribute("title")
          || button.getAttribute("aria-label")
          || button.getAttribute("name")
          || "",
        );
        if (
          titleText.includes("clear")
          || titleText.includes("reset")
          || titleText.includes("delete")
          || titleText.includes("trash")
        ) return true;

        const headerActions = button.closest(".chat-box .header-actions");
        if (!isFrameHTMLElement(headerActions)) return false;
        const buttons = Array.from(
          headerActions.querySelectorAll(".icon-btn, button"),
        ).filter((node) => isFrameHTMLElement(node));
        return buttons.length >= 1 && buttons[0] === button;
      };

      const queueInlineResetAfterClear = () => {
        if (session.clearResetTimer) {
          clearTimeout(session.clearResetTimer);
          session.clearResetTimer = null;
        }
        session.clearResetTimer = window.setTimeout(() => {
          resetInlineMenuSession(frameDoc, session, activeLocale.questions, iconUrl);
          clearChatHistoryRows(frameDoc);
          const inputNode = frameDoc.querySelector(".input-area input");
          if (inputNode) {
            inputNode.value = "";
            inputNode.dispatchEvent(new Event("input", { bubbles: true }));
          }
          session.clearResetTimer = window.setTimeout(() => {
            session.clearResetTimer = null;
            resetInlineMenuSession(frameDoc, session, activeLocale.questions, iconUrl);
            clearChatHistoryRows(frameDoc);
          }, 240);
        }, 120);
      };

      const onFramePointerDownCapture = (event) => {
        const target = getTargetElement(event);
        if (!isFrameElement(target)) return;
        if (isClearChatAction(target)) {
          queueInlineResetAfterClear();
          return;
        }
      };

      const onFrameClickCapture = (event) => {
        const target = getTargetElement(event);
        if (!isFrameElement(target)) return;

        const menuButton = target.closest(".saarthi-inline-menu__option");
        if (isFrameHTMLElement(menuButton)) {
          handleMenuSelection(menuButton, event);
          return;
        }

        if (isClearChatAction(target)) {
          queueInlineResetAfterClear();
          return;
        }

        const sendButton = target.closest(".input-area button");
        if (sendButton && session.ownerApiMode) {
          if (session.bypassOwnerModeOnce) {
            session.bypassOwnerModeOnce = false;
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          void handleOwnerApiSubmit(frameDoc, session);
        }
      };

      const onFrameKeyDownCapture = (event) => {
        const target = getTargetElement(event);
        if (!isFrameElement(target)) return;
        if (event.key !== "Enter") return;
        if (!target.closest(".input-area input")) return;
        if (!session.ownerApiMode) return;
        if (session.bypassOwnerModeOnce) {
          session.bypassOwnerModeOnce = false;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        void handleOwnerApiSubmit(frameDoc, session);
      };

      frameDoc.addEventListener("pointerdown", onFramePointerDownCapture, true);
      frameDoc.addEventListener("click", onFrameClickCapture, true);
      frameDoc.addEventListener("keydown", onFrameKeyDownCapture, true);
      session.boundDoc = frameDoc;
      session.docCleanup = () => {
        session.menuActionHandler = null;
        if (session.clearResetTimer) {
          clearTimeout(session.clearResetTimer);
          session.clearResetTimer = null;
        }
        frameDoc.removeEventListener("pointerdown", onFramePointerDownCapture, true);
        frameDoc.removeEventListener("click", onFrameClickCapture, true);
        frameDoc.removeEventListener("keydown", onFrameKeyDownCapture, true);
      };
    };

    const syncWidget = () => {
      const frameDoc = iframe.contentDocument;
      if (!frameDoc?.documentElement || !frameDoc.head || !frameDoc.body) return;
      frameDoc.documentElement.lang = lang === "hi" ? "hi" : "en";

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
      if (subtitleNode && subtitleNode.textContent?.trim() !== activeLocale.subtitle) {
        subtitleNode.textContent = activeLocale.subtitle;
      }

      const faqTitleNode = frameDoc.querySelector(".faq-suggestions-title");
      if (faqTitleNode && faqTitleNode.textContent?.trim() !== activeLocale.faqTitle) {
        faqTitleNode.textContent = activeLocale.faqTitle;
      }

      const inputNode = frameDoc.querySelector(".input-area input");
      if (inputNode && inputNode.getAttribute("placeholder") !== activeLocale.inputPlaceholder) {
        inputNode.setAttribute("placeholder", activeLocale.inputPlaceholder);
      }

      frameDoc.querySelectorAll(".faq-suggestion-item").forEach((node, index) => {
        if (!(node instanceof HTMLElement)) return;
        const nextText = activeLocale.questions[index];
        if (!nextText) return;
        if (node.textContent?.trim() !== nextText) {
          node.textContent = nextText;
        }
      });

      const welcomeNode = frameDoc.querySelector(".message-row.bot-row .message-bubble.bot");
      if (welcomeNode) {
        const current = normalizeText(welcomeNode.textContent);
        const englishWelcome = normalizeText(CHATBOT_LOCALE.en.welcomeMessage);
        const hindiWelcome = normalizeText(CHATBOT_LOCALE.hi.welcomeMessage);
        const looksLikeWelcome =
          current === englishWelcome
          || current === hindiWelcome
          || (
            current.includes("welcome! i am eodb saarthi")
            && current.includes("ask your question in english or hinglish")
          )
          || (
            current.includes("स्वागत है")
            && current.includes("eodb saarthi")
          );
        if (looksLikeWelcome && welcomeNode.textContent?.trim() !== activeLocale.welcomeMessage) {
          welcomeNode.textContent = activeLocale.welcomeMessage;
        }
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

      const session = menuSessionRef.current;
      installFrameHandlers(frameDoc);

      const inlineRenderKey = buildInlineRenderKey(lang, session);
      const menuNodeMissing = !frameDoc.querySelector(".saarthi-inline-menu");
      const jumpButtonMissing = !frameDoc.querySelector(".saarthi-inline-menu__jump");
      const renderedRows = frameDoc.querySelectorAll(".saarthi-menu-qa-row").length;
      const expectedRows = Array.isArray(session.injectedMessages) ? session.injectedMessages.length : 0;
      const needsInlineRender =
        menuNodeMissing
        || jumpButtonMissing
        || renderedRows !== expectedRows
        || session.lastInlineRenderKey !== inlineRenderKey;

      if (needsInlineRender) {
        renderInlineMenu(frameDoc, session, activeLocale.questions);
        renderInjectedMessages(frameDoc, session, iconUrl);
        ensureJumpToMenuButton(frameDoc, session);
        session.lastInlineRenderKey = inlineRenderKey;
      }

      setIsOpen(Boolean(frameDoc.querySelector(".chat-box")));
      syncBottomOffset();
    };

    const runScheduledSync = () => {
      const scheduler = syncSchedulerRef.current;
      scheduler.pending = false;
      scheduler.timer = null;
      if (scheduler.destroyed) return;
      scheduler.lastRunAt = Date.now();
      syncWidget();
    };

    const scheduleSyncWidget = () => {
      const scheduler = syncSchedulerRef.current;
      if (scheduler.destroyed || scheduler.pending) return;

      const now = Date.now();
      const minGapMs = 120;
      const elapsed = now - scheduler.lastRunAt;
      const delay = elapsed >= minGapMs ? 0 : (minGapMs - elapsed);

      scheduler.pending = true;
      scheduler.timer = window.setTimeout(runScheduledSync, delay);
    };

    const setupObservers = () => {
      scheduleSyncWidget();

      const frameDoc = iframe.contentDocument;
      if (!frameDoc) return;

      layoutObserverRef.current?.disconnect();
      layoutObserverRef.current = new MutationObserver(() => {
        scheduleSyncWidget();
      });
      layoutObserverRef.current.observe(frameDoc.body, {
        childList: true,
        subtree: true,
      });
    };

    iframe.addEventListener("load", setupObservers);
    if (iframe.contentDocument?.readyState === "complete") {
      setupObservers();
    }

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      scheduleSyncWidget();
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
      const scheduler = syncSchedulerRef.current;
      scheduler.destroyed = true;
      if (scheduler.timer) {
        clearTimeout(scheduler.timer);
        scheduler.timer = null;
      }
      scheduler.pending = false;

      const session = menuSessionRef.current;
      if (session.docCleanup) {
        session.docCleanup();
        session.docCleanup = null;
      }
      if (session.jumpContainer && session.onJumpScroll) {
        session.jumpContainer.removeEventListener("scroll", session.onJumpScroll);
      }
      session.jumpContainer = null;
      session.onJumpScroll = null;
      session.boundDoc = null;
      if (session.pendingAskTimer) {
        clearTimeout(session.pendingAskTimer);
        session.pendingAskTimer = null;
      }
      if (session.clearResetTimer) {
        clearTimeout(session.clearResetTimer);
        session.clearResetTimer = null;
      }

      iframe.removeEventListener("load", setupObservers);
      observerRef.current?.disconnect();
      layoutObserverRef.current?.disconnect();
      hostLayoutObserverRef.current?.disconnect();
      document.removeEventListener("click", onHostClickCapture, true);
      document.removeEventListener("pointerdown", onHostPointerDownCapture, true);
    };
  }, [activeLocale, chatbotIconPath, chatbotCssPath, chatbotJsPath, lang]);

  return (
    <div
      className={`saarthi-chatbot-widget ${isOpen ? "saarthi-chatbot-widget--open" : ""} ${blurred ? "saarthi-chatbot-widget--blurred" : ""} ${hidden ? "saarthi-chatbot-widget--hidden" : ""}`}
      style={{
        "--chatbot-bottom-offset": `${bottomOffset}px`,
      }}
    >
      {!isOpen ? (
        <button
          type="button"
          className="saarthi-chatbot-widget__launcher"
          onClick={openChatFromHost}
          aria-label="Open EODB Saarthi chatbot"
        >
          <img src={chatbotIconPath} alt="EODB Saarthi" />
        </button>
      ) : null}
      <iframe
        ref={iframeRef}
        className="saarthi-chatbot-widget__frame"
        src="about:blank"
        srcDoc={`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EODB Saarthi Chatbot</title>
    <style>
      html, body, #root {
        width: 100%;
        min-height: 100%;
        margin: 0;
        padding: 0;
        background: transparent !important;
      }
      body {
        overflow: hidden;
      }
    </style>
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
