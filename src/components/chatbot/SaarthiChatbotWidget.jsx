import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileDown,
  KeyRound,
  Layers3,
  MapPinned,
  Search,
} from "lucide-react";
import "./SaarthiChatbotWidget.css";

const CATEGORY_UI = {
  "search-land-record": {
    Icon: Search,
    en: "Find land details quickly",
    hi: "भूमि विवरण आसानी से खोजें",
  },
  "map-parcel-help": {
    Icon: MapPinned,
    en: "Map layers and parcel guidance",
    hi: "मानचित्र और भूखंड संबंधी सहायता",
  },
  "print-download-help": {
    Icon: FileDown,
    en: "Save or print record details",
    hi: "अभिलेख सहेजें या मुद्रित करें",
  },
  "login-otp-password-help": {
    Icon: KeyRound,
    en: "Account access assistance",
    hi: "खाता प्रवेश संबंधी सहायता",
  },
  "portal-terms": {
    Icon: Layers3,
    en: "Understand common land terms",
    hi: "भूमि संबंधी सामान्य शब्द समझें",
  },
  faq: {
    Icon: CircleHelp,
    en: "Frequently asked questions",
    hi: "अक्सर पूछे जाने वाले प्रश्न",
  },
};

const LOCALE = {
  en: {
    assistantName: "EODB Saarthi",
    subtitle: "FAQ Assistant",
    mainTitle: "Main Menu",
    close: "Close EODB Saarthi chatbot",
    open: "Open EODB Saarthi chatbot",
    launcherHints: [
      "FAQ Saarthi is ready.",
      "Choose a help topic.",
      "Tap a question for answer.",
    ],
    menu: [
      ["search-land-record", "1 Search Land Record"],
      ["map-parcel-help", "2 Map & Parcel Help"],
      ["print-download-help", "3 Print / Download Help"],
      ["login-otp-password-help", "4 Login / OTP / Password Help"],
      ["portal-terms", "5 Portal Terms"],
      ["faq", "6 FAQ"],
    ],
    sections: {
      "search-land-record": {
        title: "Search Land Record",
        questions: [
          ["How to search land records?", "Select District, Tehsil, Village and enter Khasra/Murabba details, then use the portal search option."],
          ["What fields are required to search?", "Recommended fields are District, Tehsil, Village and either Khasra or Murabba. Owner name can improve accuracy."],
          ["Can I search by owner name?", "Yes. For better results, include District, Tehsil and Village along with owner name."],
          ["Why am I getting no records?", "Check spelling, village/tehsil selection and whether the details are complete. Refresh and try again if needed."],
          ["Which languages are supported?", "The FAQ supports English and Hindi based on the portal language mode."],
        ],
      },
      "map-parcel-help": {
        title: "Map & Parcel Help",
        questions: [
          ["How to select parcel on map?", "Open the relevant land record, zoom to the parcel area and use the map parcel selection tools."],
          ["Why parcel not highlighted?", "Parcel may not highlight if details are incorrect, the layer is not visible, or the map is not zoomed enough."],
          ["The map is not loading. What should I do?", "Check internet connection, refresh the browser and reopen the page if the map still does not load."],
          ["How can I refine too many search results?", "Add more precise information such as the Murabba number, Khasra number, owner name, and correct village or tehsil."],
          ["When does cadastral layer appear?", "Cadastral layer is shown after map zoom reaches 1:4000."],
        ],
      },
      "print-download-help": {
        title: "Print / Download Help",
        questions: [
          ["How can I download or print record details?", "Open the record first, then use the available Print or Download/Export option."],
          ["Can I download or save Khasra details?", "Use the available Download/Export option after opening the Khasra details."],
        ],
      },
      "login-otp-password-help": {
        title: "Login / OTP / Password Help",
        questions: [
          ["What should I do if I cannot log in?", "Verify your user ID, password, and OTP. If needed, reset the password and try again."],
          ["I am not receiving OTP. What should I do?", "Check mobile network, DND settings and retry after some time."],
          ["How can I reset a forgotten password?", "Use the Forgot Password option and complete OTP verification."],
          ["What should I do if my session has expired?", "Log in again and retry the action."],
        ],
      },
      "portal-terms": {
        title: "Portal Terms",
        questions: [
          ["What is Khasra number?", "Khasra number is the identification number of a specific land parcel."],
          ["What is Muraba/Murabba?", "Murabba is a larger land grid or block containing land parcels."],
          ["What is the difference between a district, tehsil, and village?", "A district is the larger administrative level, a tehsil is within a district, and a village is within a tehsil."],
          ["Is portal data legally valid for transactions?", "Portal data is for reference. For legal or transaction use, prefer certified department records."],
        ],
      },
      faq: {
        title: "FAQ",
        questions: [
          ["What topics does this chatbot cover?", "You can use this FAQ for land record searches, map and parcel help, printing and downloading, login and OTP help, and portal terms."],
          ["Can I use the chatbot in English?", "Yes. Select English as the portal language to view all chatbot questions and answers in English."],
          ["Which browsers are officially supported?", "Use a modern browser such as Chrome, Edge or Firefox for best results."],
          ["Can I switch portal language to Hindi?", "Yes. Use the global portal language toggle to switch the chatbot and portal text."],
        ],
      },
    },
  },
  hi: {
    assistantName: "EODB सारथी",
    subtitle: "सामान्य प्रश्न सहायक",
    mainTitle: "मुख्य मेनू",
    close: "EODB सारथी चैटबॉट बंद करें",
    open: "EODB सारथी चैटबॉट खोलें",
    launcherHints: [
      "सामान्य प्रश्न सहायक तैयार है।",
      "सहायता विषय चुनें।",
      "प्रश्न दबाकर उत्तर देखें।",
    ],
    menu: [
      ["search-land-record", "1 भूमि अभिलेख खोजें"],
      ["map-parcel-help", "2 मानचित्र और भूखंड सहायता"],
      ["print-download-help", "3 मुद्रण / डाउनलोड सहायता"],
      ["login-otp-password-help", "4 प्रवेश / ओटीपी / कूटशब्द सहायता"],
      ["portal-terms", "5 पोर्टल शब्दावली"],
      ["faq", "6 सामान्य प्रश्न"],
    ],
    sections: {
      "search-land-record": {
        title: "भूमि अभिलेख खोजें",
        questions: [
          ["भूमि अभिलेख कैसे खोजें?", "जिला, तहसील और गांव चुनें। फिर खसरा या मुरब्बा विवरण दर्ज करके पोर्टल के खोज विकल्प का उपयोग करें।"],
          ["खोज के लिए कौन-कौन से विवरण आवश्यक हैं?", "जिला, तहसील, गांव और खसरा या मुरब्बा संख्या भरना उचित है। मालिक का नाम भरने से परिणाम अधिक सटीक हो सकते हैं।"],
          ["क्या मैं मालिक के नाम से खोज सकता हूं?", "हां। बेहतर परिणाम के लिए मालिक के नाम के साथ जिला, तहसील और गांव भी भरें।"],
          ["भूमि अभिलेख क्यों नहीं मिल रहे हैं?", "वर्तनी, गांव और तहसील के चयन तथा भरे गए विवरण की जांच करें। आवश्यकता होने पर पृष्ठ को पुनः खोलकर प्रयास करें।"],
          ["कौन-कौन सी भाषाएं उपलब्ध हैं?", "सामान्य प्रश्न सहायक पोर्टल पर चुनी गई भाषा के अनुसार अंग्रेजी या हिंदी में दिखाई देता है।"],
        ],
      },
      "map-parcel-help": {
        title: "मानचित्र और भूखंड सहायता",
        questions: [
          ["मानचित्र पर भूखंड कैसे चुनें?", "संबंधित भूमि अभिलेख खोलें, भूखंड क्षेत्र को बड़ा करके देखें और मानचित्र पर उपलब्ध भूखंड चयन साधन का उपयोग करें।"],
          ["भूखंड चिन्हित क्यों नहीं हो रहा है?", "विवरण गलत हो सकते हैं, आवश्यक परत दिखाई नहीं दे रही हो सकती है या मानचित्र पर्याप्त रूप से बड़ा नहीं किया गया होगा।"],
          ["मानचित्र नहीं खुल रहा है, क्या करें?", "अंतरजाल संपर्क की जांच करें, पृष्ठ को पुनः खोलें और समस्या बनी रहने पर ब्राउज़र दोबारा खोलें।"],
          ["बहुत अधिक परिणाम आने पर खोज को सीमित कैसे करें?", "मुरब्बा संख्या, खसरा संख्या, मालिक का नाम तथा सही गांव और तहसील जैसी अधिक सटीक जानकारी भरें।"],
          ["भू-अभिलेख परत कब दिखाई देती है?", "मानचित्र का माप 1:4000 तक पहुंचने पर भू-अभिलेख परत दिखाई देती है।"],
        ],
      },
      "print-download-help": {
        title: "मुद्रण / डाउनलोड सहायता",
        questions: [
          ["अभिलेख का विवरण डाउनलोड या मुद्रित कैसे करें?", "पहले अभिलेख खोलें, फिर उपलब्ध मुद्रण या डाउनलोड विकल्प का उपयोग करें।"],
          ["क्या मैं खसरा विवरण डाउनलोड या सहेज सकता हूं?", "खसरा विवरण खोलने के बाद उपलब्ध डाउनलोड विकल्प का उपयोग करें।"],
        ],
      },
      "login-otp-password-help": {
        title: "प्रवेश / ओटीपी / कूटशब्द सहायता",
        questions: [
          ["पोर्टल में प्रवेश नहीं हो रहा है, क्या करें?", "उपयोगकर्ता पहचान, कूटशब्द और ओटीपी की जांच करें। आवश्यकता होने पर कूटशब्द बदलकर फिर प्रयास करें।"],
          ["ओटीपी प्राप्त नहीं हो रहा है, क्या करें?", "मोबाइल संजाल और संदेश अवरोध सेटिंग की जांच करें, फिर कुछ समय बाद दोबारा प्रयास करें।"],
          ["भूला हुआ कूटशब्द कैसे बदलें?", "कूटशब्द भूल गए विकल्प का उपयोग करें और ओटीपी सत्यापन पूरा करें।"],
          ["सत्र समाप्त हो गया है, अब क्या करें?", "पोर्टल में दोबारा प्रवेश करें और फिर से प्रयास करें।"],
        ],
      },
      "portal-terms": {
        title: "पोर्टल शब्दावली",
        questions: [
          ["खसरा संख्या क्या होती है?", "खसरा संख्या भूमि के एक विशिष्ट भूखंड की पहचान संख्या होती है।"],
          ["मुरब्बा क्या होता है?", "मुरब्बा भूमि का एक बड़ा खंड होता है जिसमें कई भूखंड शामिल होते हैं।"],
          ["जिला, तहसील और गांव में क्या अंतर है?", "जिला बड़ा प्रशासनिक क्षेत्र है, तहसील जिले के अंतर्गत होती है और गांव तहसील के अंतर्गत होता है।"],
          ["क्या पोर्टल का विवरण लेन-देन के लिए कानूनी रूप से मान्य है?", "पोर्टल का विवरण केवल संदर्भ के लिए है। कानूनी कार्य या लेन-देन के लिए प्रमाणित विभागीय अभिलेख को प्राथमिकता दें।"],
        ],
      },
      faq: {
        title: "सामान्य प्रश्न",
        questions: [
          ["इस सहायक में किन विषयों की जानकारी मिल सकती है?", "इस सहायक से भूमि अभिलेख खोज, मानचित्र और भूखंड सहायता, मुद्रण और डाउनलोड, प्रवेश और ओटीपी सहायता तथा पोर्टल शब्दावली की जानकारी मिलती है।"],
          ["क्या मैं इस सहायक का उपयोग हिंदी में कर सकता हूं?", "हां। सभी प्रश्न और उत्तर हिंदी में देखने के लिए पोर्टल की भाषा के रूप में हिंदी चुनें।"],
          ["कौन-कौन से ब्राउज़र समर्थित हैं?", "बेहतर परिणाम के लिए क्रोम, एज या फायरफॉक्स जैसे आधुनिक ब्राउज़र का उपयोग करें।"],
          ["क्या पोर्टल की भाषा हिंदी में बदली जा सकती है?", "हां। पोर्टल के भाषा चयन विकल्प से चैटबॉट और पोर्टल की भाषा बदली जा सकती है।"],
        ],
      },
    },
  },
};

export default function SaarthiChatbotWidget({ lang = "en", blurred = false, hidden = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(28);
  const [activeMenu, setActiveMenu] = useState("main");
  const [expandedKey, setExpandedKey] = useState("");
  const [launcherHintIndex, setLauncherHintIndex] = useState(0);
  const [showLauncherHint, setShowLauncherHint] = useState(false);

  const chatbotIconPath = `${import.meta.env.BASE_URL}chatbot/assets/img_1.png`;
  const chatbotLauncherFlipIconPath = `${import.meta.env.BASE_URL}chatbot/assets/img_2.png`;
  const locale = LOCALE[lang] || LOCALE.en;
  const isMainMenu = activeMenu === "main";

  const activeSection = useMemo(() => (
    isMainMenu ? null : locale.sections[activeMenu]
  ), [activeMenu, isMainMenu, locale]);

  const resetMenu = () => {
    setActiveMenu("main");
    setExpandedKey("");
  };

  const isHostElementVisible = (node) => {
    if (!node) return false;
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };

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

  const syncBottomOffset = () => {
    const tablePanel = document.querySelector(".parcel-table-panel");
    const panelActionRow = document.querySelector(".parcel-table-panel__actions");
    const tableOpenViewport = document.querySelector(".map-stage__viewport--table-open");
    const onMapPage = Boolean(document.querySelector(".map-stage"));
    const isBottomPanelOpen = Boolean(tableOpenViewport) && [tablePanel, panelActionRow].some(isHostElementVisible);
    let nextOffset = onMapPage ? 62 : 32;

    if (isBottomPanelOpen && tablePanel) {
      const panelRect = tablePanel.getBoundingClientRect();
      const panelTopOffset = Math.max(0, window.innerHeight - panelRect.top);
      nextOffset = Math.max(nextOffset, panelTopOffset + 28);
    }

    if (isOpen) {
      nextOffset += 18;
    }

    setBottomOffset(nextOffset);
  };

  useEffect(() => {
    resetMenu();
  }, [lang]);

  useEffect(() => {
    syncBottomOffset();

    const scheduleSync = () => {
      window.setTimeout(syncBottomOffset, 0);
    };

    const closeChatForHostPanel = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".parcel-table-toggle, .parcel-table-panel__close")) return;

      setIsOpen(false);
      resetMenu();
      scheduleSync();
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", scheduleSync);
    document.addEventListener("click", closeChatForHostPanel, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleSync);
      document.removeEventListener("click", closeChatForHostPanel, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || hidden || blurred || !locale.launcherHints.length) {
      setShowLauncherHint(false);
      return undefined;
    }

    const cycleDurationMs = 10000;
    const stepMs = 3000;
    const timers = [];

    const runCycle = () => {
      setLauncherHintIndex(0);
      setShowLauncherHint(true);

      locale.launcherHints.slice(1, 3).forEach((_, index) => {
        timers.push(window.setTimeout(() => {
          setLauncherHintIndex(index + 1);
          setShowLauncherHint(true);
        }, (index + 1) * stepMs));
      });

      timers.push(window.setTimeout(() => {
        setShowLauncherHint(false);
      }, cycleDurationMs - 1000));
    };

    runCycle();
    const intervalId = window.setInterval(runCycle, cycleDurationMs);

    return () => {
      window.clearInterval(intervalId);
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [blurred, hidden, isOpen, locale.launcherHints]);

  const openChat = () => {
    closeBottomPanelIfOpen();
    setIsOpen(true);
    setShowLauncherHint(false);
    window.setTimeout(syncBottomOffset, 0);
  };

  const closeChat = () => {
    setIsOpen(false);
    resetMenu();
  };

  const openMenu = (menuKey) => {
    setActiveMenu(menuKey);
    setExpandedKey("");
  };

  const toggleQuestion = (question) => {
    setExpandedKey((current) => (current === question ? "" : question));
  };

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
          onClick={openChat}
          aria-label={locale.open}
        >
          <span className="saarthi-chatbot-widget__launcher-flip" aria-hidden="true">
            <img src={chatbotIconPath} alt="" />
            <img src={chatbotLauncherFlipIconPath} alt="" />
          </span>
        </button>
      ) : null}

      {!isOpen ? (
        <div
          className={`saarthi-chatbot-widget__hint ${showLauncherHint ? "saarthi-chatbot-widget__hint--visible" : ""}`}
          aria-hidden={!showLauncherHint}
        >
          {locale.launcherHints[launcherHintIndex] || locale.launcherHints[0]}
        </div>
      ) : null}

      {isOpen ? (
        <section className="saarthi-chatbot-widget__panel" aria-label={locale.assistantName}>
          <header className="saarthi-chatbot-widget__header">
            <img className="saarthi-chatbot-widget__header-logo" src={chatbotIconPath} alt="" />
            <div className="saarthi-chatbot-widget__header-text">
              <h3>{locale.assistantName}</h3>
              <p>{locale.subtitle}</p>
            </div>
            <button
              type="button"
              className="saarthi-chatbot-widget__close"
              onClick={closeChat}
              aria-label={locale.close}
            >
              X
            </button>
          </header>

          <div className="saarthi-chatbot-widget__content">
            <section className="saarthi-faq-menu">
              <div className="saarthi-faq-menu__title-row">
                {!isMainMenu ? (
                  <button
                    type="button"
                    className="saarthi-faq-menu__back"
                    onClick={() => openMenu("main")}
                    aria-label={locale.mainTitle}
                  >
                    <ChevronLeft size={17} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                ) : null}
                <div className="saarthi-faq-menu__heading">
                  {!isMainMenu ? (
                    <div className="saarthi-faq-menu__eyebrow">
                      {locale.mainTitle}
                    </div>
                  ) : null}
                  <div className="saarthi-faq-menu__title">
                    {isMainMenu ? locale.mainTitle : activeSection?.title}
                  </div>
                </div>
              </div>

              {isMainMenu ? (
                <div className="saarthi-faq-menu__options">
                  {locale.menu.map(([menuKey, label]) => {
                    const categoryUi = CATEGORY_UI[menuKey];
                    const CategoryIcon = categoryUi.Icon;
                    return (
                      <button
                        key={menuKey}
                        type="button"
                        className="saarthi-faq-menu__option saarthi-faq-menu__option--category"
                        onClick={() => openMenu(menuKey)}
                      >
                        <span className="saarthi-faq-menu__category-icon" aria-hidden="true">
                          <CategoryIcon size={19} strokeWidth={2.2} />
                        </span>
                        <span className="saarthi-faq-menu__category-copy">
                          <span className="saarthi-faq-menu__category-title">
                            {label.replace(/^\d+\s*/, "")}
                          </span>
                          <span className="saarthi-faq-menu__category-subtitle">
                            {categoryUi[lang] || categoryUi.en}
                          </span>
                        </span>
                        <ChevronRight
                          className="saarthi-faq-menu__category-arrow"
                          size={18}
                          strokeWidth={2.3}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="saarthi-faq-menu__options">
                    {activeSection?.questions.map(([question, answer], index) => {
                      const isExpanded = expandedKey === question;
                      const answerId = `saarthi-answer-${activeMenu}-${index}`;
                      return (
                        <div
                          key={question}
                          className={`saarthi-faq-menu__item ${isExpanded ? "saarthi-faq-menu__item--open" : ""}`}
                        >
                          <button
                            type="button"
                            className="saarthi-faq-menu__option saarthi-faq-menu__option--question"
                            onClick={() => toggleQuestion(question)}
                            aria-expanded={isExpanded}
                            aria-controls={answerId}
                          >
                            <span>{question}</span>
                            <span className="saarthi-faq-menu__accordion-icon" aria-hidden="true">
                              {isExpanded ? "\u2212" : "+"}
                            </span>
                          </button>
                          <div
                            id={answerId}
                            className="saarthi-faq-menu__answer-wrap"
                            aria-hidden={!isExpanded}
                          >
                            <div className="saarthi-faq-menu__answer">
                              <CircleHelp size={16} strokeWidth={2.2} aria-hidden="true" />
                              <span>{answer}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="saarthi-faq-menu__main-menu-button"
                    onClick={() => openMenu("main")}
                  >
                    <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
                    {lang === "hi" ? "मुख्य मेनू पर वापस जाएं" : "Back to Main Menu"}
                  </button>
                </>
              )}
            </section>
          </div>
        </section>
      ) : null}
    </div>
  );
}
