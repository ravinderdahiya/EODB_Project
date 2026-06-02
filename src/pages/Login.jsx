import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { createTranslator, useLanguage } from "@/context/LanguageContext";
import axiosInstance from "../utils/axiosInstance";
import LanguageToggle from "@/components/LanguageToggle";
import { reloadRuntimeConfig } from "@/config/runtimeConfig";
import { mountSplash } from "../splash";
import { buildDevicePayload } from "../utils/deviceIdentity";

const LOGIN_FONT_FADE_OUT_MS = 380;
const LOGIN_FONT_FADE_IN_MS = 420;
const INSIGHTS_REFRESH_INTERVAL_MS = 60 * 1000;

const FALLBACK_INSIGHT_METRICS = {
  totalRegisteredUsers: 0,
  activeSessions: 0,
  activeUsers: 0,
  loggedInToday: 0,
};

const formatCompactNumber = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0";

  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue);
};

export default function Login() {
  const navigate = useNavigate();
  const { lang, hasPersistedLanguage, setPreviewLang, resetLoginPreview, commitLanguage } = useLanguage();
  const previewIntervalRef = useRef(null);
  const previewLangRef = useRef("en");
  const skipFontTransitionRef = useRef(true);
  const [displayLang, setDisplayLang] = useState(lang);
  const [fontPhase, setFontPhase] = useState("");
  const t = useMemo(() => createTranslator(displayLang), [displayLang]);

  const [phone, setPhone] = useState("");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [insightMetrics, setInsightMetrics] = useState(FALLBACK_INSIGHT_METRICS);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const isOtpExpired = showOtpInput && otpTimer === 0;
  const canResendOtp = showOtpInput && otpTimer === 0 && !isResendingOtp && !isSendingOtp;
  const canVerifyOtp = !isOtpExpired && !isVerifyingOtp;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const timerText = useMemo(() => formatTimer(otpTimer), [otpTimer]);

  useEffect(() => {
    if (!showOtpInput || otpTimer <= 0) return undefined;
    const intervalId = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [showOtpInput, otpTimer]);

  useEffect(() => {
    resetLoginPreview();
    previewLangRef.current = "en";
    skipFontTransitionRef.current = true;
    setFontPhase("");
  }, [resetLoginPreview]);

  useEffect(() => {
    if (skipFontTransitionRef.current) {
      skipFontTransitionRef.current = false;
      setDisplayLang(lang);
      return undefined;
    }

    setFontPhase("out");
    const swapTimer = window.setTimeout(() => {
      setDisplayLang(lang);
      setFontPhase("in");
      window.setTimeout(() => setFontPhase(""), LOGIN_FONT_FADE_IN_MS);
    }, LOGIN_FONT_FADE_OUT_MS);

    return () => clearTimeout(swapTimer);
  }, [lang]);

  useEffect(() => {
    if (hasPersistedLanguage) {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
      return undefined;
    }

    if (previewIntervalRef.current) return undefined;

    previewIntervalRef.current = window.setInterval(() => {
      previewLangRef.current = previewLangRef.current === "en" ? "hi" : "en";
      setPreviewLang(previewLangRef.current);
    }, 6000);

    return () => {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    };
  }, [hasPersistedLanguage, setPreviewLang]);

  useEffect(() => {
    let isMounted = true;

    const loadPublicInsights = async () => {
      try {
        const response = await axiosInstance.get("/user/public-login-insights");
        if (!isMounted) return;

        const nextMetrics = response?.data?.metrics || FALLBACK_INSIGHT_METRICS;

        setInsightMetrics({
          totalRegisteredUsers: Number(nextMetrics.totalRegisteredUsers || 0),
          activeSessions: Number(nextMetrics.activeSessions || 0),
          activeUsers: Number(nextMetrics.activeUsers || 0),
          loggedInToday: Number(nextMetrics.loggedInToday || 0),
        });
      } catch {
        if (!isMounted) return;
        setInsightMetrics(FALLBACK_INSIGHT_METRICS);
      } finally {
        if (isMounted) {
          setInsightsLoading(false);
        }
      }
    };

    loadPublicInsights();
    const refreshId = window.setInterval(loadPublicInsights, INSIGHTS_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(refreshId);
    };
  }, []);

  const liveMetricCards = useMemo(() => ([
    {
      id: "registered",
      icon: "U",
      label: t("login.liveRegisteredUsers"),
      value: formatCompactNumber(insightMetrics.totalRegisteredUsers),
    },
    {
      id: "active-sessions",
      icon: "S",
      label: t("login.liveActiveSessions"),
      value: formatCompactNumber(insightMetrics.activeSessions),
    },
    {
      id: "active-users",
      icon: "A",
      label: t("login.liveActiveUsers"),
      value: formatCompactNumber(insightMetrics.activeUsers),
    },
    {
      id: "today-logins",
      icon: "T",
      label: t("login.liveTodayLogins"),
      value: formatCompactNumber(insightMetrics.loggedInToday),
    },
  ]), [insightMetrics, t]);

  const clearAuthMarkers = () => {
    sessionStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("isAdmin");
  };

  const establishTrustedSession = async ({ requireAdmin = false } = {}) => {
    const meResponse = await axiosInstance.get("/user/me");
    const serverUser = meResponse?.data || {};

    if (!serverUser?.id) {
      throw new Error("Unable to validate authenticated session.");
    }

    const serverRole = String(serverUser?.role || "").toLowerCase().trim();
    const isAdmin = serverRole === "admin" || serverRole === "superadmin";

    if (requireAdmin && !isAdmin) {
      throw new Error(t("login.errBadAdmin"));
    }

    sessionStorage.setItem("user", JSON.stringify(serverUser));
    sessionStorage.setItem("isAdmin", isAdmin ? "true" : "false");
    sessionStorage.setItem("isAuthenticated", "true");

    return serverUser;
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("");

    if (isOtpExpired) {
      setError(t("login.errOtpExpired"));
      return;
    }

    if (enteredOtp.length !== 4) {
      setError(t("login.errInvalidOtp"));
      return;
    }

    try {
      setIsVerifyingOtp(true);
      await axiosInstance.post("/otp/verify-otp", {
        phone,
        otp: enteredOtp,
        ...buildDevicePayload(),
      });
      await establishTrustedSession({ requireAdmin: false });
      commitLanguage();
      await reloadRuntimeConfig();
      mountSplash();
      navigate("/map");
    } catch (err) {
      clearAuthMarkers();
      setError(err.response?.data?.message || t("login.errOtpFailed"));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    setError("");

    try {
      setIsResendingOtp(true);
      const res = await axiosInstance.post("/otp/resend-otp", {
        phone,
        ...buildDevicePayload(),
      });
      if (res.data?.smsSent === true) {
        setOtp(["", "", "", ""]);
        setOtpTimer(120);
      } else {
        setError(res.data?.message || res.data?.warning || t("login.errSendFailed"));
      }
    } catch (err) {
      setError(err.response?.data?.message || t("login.errSendFailed"));
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handlePublicLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (showOtpInput) {
      await handleVerifyOtp();
      return;
    }

    if (!phone.trim()) {
      setError(t("login.errNoPhone"));
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError(t("login.errBadPhone"));
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await axiosInstance.post("/otp/send-otp", {
        phone,
        ...buildDevicePayload(),
      });
      if (res.data?.vipLogin && res.data?.user) {
        await establishTrustedSession({ requireAdmin: false });
        commitLanguage();
        await reloadRuntimeConfig();
        mountSplash();
        navigate("/map");
        return;
      }

      if (res.data?.smsSent === true) {
        setShowOtpInput(true);
        setOtp(["", "", "", ""]);
        setOtpTimer(120);
      } else {
        setError(res.data?.message || res.data?.warning || t("login.errSendFailed"));
      }
    } catch (err) {
      clearAuthMarkers();
      setError(err.response?.data?.message || t("login.errSendFailed"));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");

    if (!adminId.trim() || !password.trim()) {
      setAdminError(t("login.errBadAdmin"));
      return;
    }

    try {
      setIsAdminLoggingIn(true);
      await axiosInstance.post("/user/admin-login", {
        adminId,
        password,
        ...buildDevicePayload(),
      });
      await establishTrustedSession({ requireAdmin: true });
      commitLanguage();
      await reloadRuntimeConfig();
      setShowAdminPanel(false);
      navigate("/admin");
    } catch (err) {
      clearAuthMarkers();
      setAdminError(err.response?.data?.message || t("login.errBadAdmin"));
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const toggleAdminPanel = () => {
    setShowAdminPanel(true);
    setAdminError("");
  };

  return (
    <div
      className={`lp-root${fontPhase ? ` lp-font-phase-${fontPhase}` : ""}`}
      data-lang={displayLang}
    >

      {/* ── NAVBAR ─────────────────────────────────── */}
      <header className="lp-navbar">
        <div className="lp-nav-left">
          <div className="lp-logo-flip" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + "branding/Emblem_of_Haryana.svg"} alt="Haryana Logo" />
            <img src={import.meta.env.BASE_URL + "branding/harsac.png"}   alt="HARSAC Logo" />
          </div>
          <div className="lp-logo-text-group">
            <div className="lp-main-title">44212-GeoStack EODB</div>
            <div className="lp-tagline">Ease of Doing Business</div>
            <div className="lp-sub-title">Haryana</div>
          </div>
        </div>

        <div className="lp-nav-right">
          {/* Language toggle buttons */}
          <LanguageToggle
            wrapperClass="lp-lang-toggle"
            btnClass="lp-lang-btn"
            activeClass="lp-lang-btn--active"
            persistSelection={false}
            compact={false}
          />
          <button
            type="button"
            className="lp-chat-btn"
            onClick={toggleAdminPanel}
            aria-expanded={showAdminPanel}
            aria-controls="lp-login-card-mode"
          >
            {t("login.tabAdmin")}
          </button>
        </div>
      </header>


      {/* ── MAIN SPLIT ─────────────────────────────── */}
      <main className="lp-main">

        {/* LEFT — Hero Content */}
        <section className="lp-left">
          <div className="lp-badge">{t("login.badge")}</div>

          <h1 className="lp-headline">
            <span className="lp-green">{t("login.headline1")}</span><br />
            {t("login.headline2")}<br />
            {t("login.headline3")}
          </h1>

          <p className="lp-desc">{t("login.desc")}</p>

          <div className="lp-stats">
            <div className="lp-stat-card"><h3>23</h3><p>{t("login.statsDistricts")}</p></div>
            <div className="lp-stat-card"><h3>143</h3><p>{t("login.statsTehsils")}</p></div>
            <div className="lp-stat-card"><h3>7,103</h3><p>{t("login.statsVillages")}</p></div>
            <div className="lp-stat-card"><h3>1.7Cr+</h3><p>{t("login.statsParcels")}</p></div>
          </div>

        </section>

        {/* RIGHT — Login Card */}
        <aside className="lp-card">
          <div className="lp-card-main">
            <div className="lp-logo-flip lp-lock-circle" aria-hidden="true">
              <img src={import.meta.env.BASE_URL + "branding/Emblem_of_Haryana.svg"} alt="Haryana Logo" />
              <img src={import.meta.env.BASE_URL + "branding/harsac.png"}   alt="HARSAC Logo" />
            </div>

            <h2 className="lp-card-title">{t("login.cardTitle")}</h2>
            <p className="lp-subtext">{t("login.cardSubtitle")}</p>

            {/* Public login marker (admin login moved to header) */}
            <div id="lp-login-card-mode" className="lp-tabs lp-tabs--single" role="tablist">
              <button type="button" role="tab" aria-selected={true} className="lp-tab lp-tab--active">
                {showAdminPanel ? t("login.tabAdmin") : t("login.tabOtp")}
              </button>
            </div>

            {/* Form */}
            {showAdminPanel ? (
              <form className="lp-admin-card-form" onSubmit={handleAdminLogin} noValidate autoComplete="off">
                <label className="lp-label" htmlFor="lp-admin-id">
                  {t("login.adminIdLabel")}
                </label>
                <input
                  id="lp-admin-id"
                  className="lp-full-input"
                  type="text"
                  autoComplete="off"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                />

                <label className="lp-label" htmlFor="lp-admin-password">
                  {t("login.passwordLabel")}
                </label>
                <input
                  id="lp-admin-password"
                  className="lp-full-input"
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {adminError && <p className="lp-error">{adminError}</p>}

                <button type="submit" className="lp-btn-green" disabled={isAdminLoggingIn}>
                  {t("login.adminLoginBtn")}
                </button>
                <button
                  type="button"
                  className="lp-btn-outline lp-back-public-btn"
                  onClick={() => {
                    setShowAdminPanel(false);
                    setAdminError("");
                  }}
                >
                  Back to Public Login
                </button>
              </form>
            ) : (
            <form onSubmit={handlePublicLogin} noValidate autoComplete="off">
              {!showOtpInput ? (
                <>
                  <label className="lp-label" htmlFor="lp-phone">
                    {t("login.phoneLabel")}
                  </label>

                  <div className="lp-input-row">
                    <div className="lp-country">+91 ▾</div>
                    <input
                      id="lp-phone"
                      className="lp-phone-input"
                      type="tel"
                      autoComplete="off"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder={t("login.phonePlaceholder")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => {
                        const allowed = ["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight","Home","End"];
                        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const digits = e.clipboardData.getData("text").replace(/\D/g, "");
                        setPhone(digits.slice(0, 10));
                      }}
                    />
                  </div>

                  <button type="submit" className="lp-btn-green" disabled={isSendingOtp}>
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="lp-btn-loading-icon" />
                        {t("login.sending")}
                      </>
                    ) : (
                      t("login.sendOtp")
                    )}
                  </button>
                </>
              ) : (
                <>
                  <label className="lp-label">{t("login.enterOtp")}</label>

                  <div className="otp-container">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength="1"
                        className="otp-input"
                        value={digit}
                        autoComplete="off"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/, "");
                          const newOtp = [...otp];
                          newOtp[index] = value;
                          setOtp(newOtp);
                          if (value && index < 3) {
                            document.getElementById(`otp-${index + 1}`).focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          const allowed = ["Tab","Escape","Enter","ArrowLeft","ArrowRight"];
                          if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && e.key !== "Backspace" && e.key !== "Delete") {
                            e.preventDefault();
                            return;
                          }
                          if (e.key === "Backspace" && !otp[index] && index > 0) {
                            document.getElementById(`otp-${index - 1}`).focus();
                          }
                        }}
                        onPaste={(e) => e.preventDefault()}
                      />
                    ))}
                  </div>

                  <div className="lp-otp-meta">
                    <p className={`lp-otp-timer${isOtpExpired ? " is-expired" : ""}`}>
                      {isOtpExpired
                        ? t("login.otpExpiredNow")
                        : `${t("login.otpExpiresIn")} ${timerText}`}
                    </p>
                    <button
                      type="button"
                      className="lp-resend-btn"
                      disabled={!canResendOtp || isResendingOtp}
                      onClick={handleResendOtp}
                    >
                      {isResendingOtp ? (
                        <>
                          <Loader2 className="lp-btn-loading-icon" />
                          {t("login.resending")}
                        </>
                      ) : canResendOtp ? (
                        t("login.resendOtp")
                      ) : (
                        `${t("login.resendOtpIn")} ${timerText}`
                      )}
                    </button>
                  </div>

                  <button type="submit" className="lp-btn-green" disabled={!canVerifyOtp}>
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="lp-btn-loading-icon" />
                        {t("login.verifying")}
                      </>
                    ) : (
                      t("login.verifyOtp")
                    )}
                  </button>
                </>
              )}

              {error && <p className="lp-error">{error}</p>}
            </form>
            )}
          </div>

          <p className="lp-terms">
            {t("login.termsText")}{" "}
            <span role="button" tabIndex={0}>{t("login.termsTos")}</span>{" "}
            {t("login.termsAnd")}{" "}
            <span role="button" tabIndex={0}>{t("login.termsPrivacy")}</span>.
          </p>
        </aside>

        {/* Live system overview — replaces latest announcements */}
        <section
          className="lp-live-overview"
          aria-label={t("login.liveSystemOverview")}
          aria-busy={insightsLoading}
        >
          <header className="lp-live-overview__header">
            <TrendingUp size={14} strokeWidth={2.25} aria-hidden="true" />
            <h4>{t("login.liveSystemOverview")}</h4>
          </header>

          <div className="lp-live-overview__grid">
            {liveMetricCards.map((card) => (
              <article className="lp-live-overview__card" key={card.id}>
                <div className="lp-live-overview__icon" aria-hidden="true">
                  {card.icon}
                </div>
                <div className="lp-live-overview__meta">
                  <h3>{insightsLoading ? "—" : card.value}</h3>
                  <p>{card.label}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <div className="lp-source-caption-wrap" aria-label="Data source">
        <div className="lp-source-caption">{t("login.imageSourceCaption")}</div>
      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-bottom">
          <p>{t("login.copyright")}</p>
          <div className="lp-socials" aria-label="Social links" />
        </div>
      </footer>
    </div>
  );
}
