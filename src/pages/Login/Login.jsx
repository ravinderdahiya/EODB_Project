import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTranslator, useLanguage } from "@/context/LanguageContext";
import axiosInstance from "../../utils/axiosInstance";
import { reloadRuntimeConfig } from "@/config/runtimeConfig";
import { prefetchMapChunk } from "@/routes/lazyRoutes";
import { mountSplash } from "../../splash";
import { buildDevicePayload } from "../../utils/deviceIdentity";
import LoginBackground from "./components/LoginBackground";
import LoginHeader from "./components/LoginHeader";
import LoginHero from "./components/LoginHero";
import LoginCard from "./components/LoginCard";
import LoginLiveOverview from "./components/LoginLiveOverview";
import LoginFooter from "./components/LoginFooter";
import "./Login.css";

const formatApiError = (err, fallback) => {
  const apiData = err?.response?.data;
  const message = apiData?.message || fallback;
  const reason = apiData?.reason ? ` (${apiData.reason})` : "";
  return `${message}${reason}`.trim();
};

const LOGIN_FONT_FADE_OUT_MS = 380;
const LOGIN_FONT_FADE_IN_MS = 420;
const INSIGHTS_REFRESH_INTERVAL_MS = 60 * 1000;
const LOGIN_HERO_ROTATE_MS = 6_000;
const LOGIN_HERO_BACKGROUNDS = [
  `${import.meta.env.BASE_URL}branding/hero-bg.jpg`,
  `${import.meta.env.BASE_URL}branding/hero-bg2.jpg`,
  `${import.meta.env.BASE_URL}branding/hero-bg3.jpg`,
];

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

function goToMapAfterLogin(navigate) {
  void reloadRuntimeConfig();
  mountSplash();
  navigate("/map");
}

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
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaText, setCaptchaText] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [activeHeroBg, setActiveHeroBg] = useState(0);

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
    prefetchMapChunk();
  }, []);

  useEffect(() => {
    LOGIN_HERO_BACKGROUNDS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const intervalId = setInterval(() => {
      setActiveHeroBg((prev) => (prev + 1) % LOGIN_HERO_BACKGROUNDS.length);
    }, LOGIN_HERO_ROTATE_MS);

    return () => clearInterval(intervalId);
  }, []);

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

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    setCaptchaText("");
    try {
      const res = await axiosInstance.get("/captcha/new");
      setCaptchaImage(res.data?.image || "");
      setCaptchaToken(res.data?.captchaToken || "");
    } catch {
      setCaptchaImage("");
      setCaptchaToken("");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
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
      goToMapAfterLogin(navigate);
    } catch (err) {
      clearAuthMarkers();
      setError(formatApiError(err, t("login.errOtpFailed")));
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
      setError(formatApiError(err, t("login.errSendFailed")));
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

    if (!captchaText.trim()) {
      setError(t("login.errNoCaptcha"));
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await axiosInstance.post("/otp/send-otp", {
        phone,
        captchaToken,
        captchaText,
        ...buildDevicePayload(),
      });
      if (res.data?.vipLogin && res.data?.user) {
        await establishTrustedSession({ requireAdmin: false });
        commitLanguage();
        goToMapAfterLogin(navigate);
        return;
      }

      if (res.data?.smsSent === true) {
        setShowOtpInput(true);
        setOtp(["", "", "", ""]);
        setOtpTimer(120);
      } else {
        setError(res.data?.message || res.data?.warning || t("login.errSendFailed"));
        loadCaptcha();
      }
    } catch (err) {
      clearAuthMarkers();
      setError(formatApiError(err, t("login.errSendFailed")));
      loadCaptcha();
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

    if (!captchaText.trim()) {
      setAdminError(t("login.errNoCaptcha"));
      return;
    }

    try {
      setIsAdminLoggingIn(true);
      await axiosInstance.post("/user/admin-login", {
        adminId,
        password,
        captchaToken,
        captchaText,
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
      loadCaptcha();
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const toggleAdminPanel = () => {
    setShowAdminPanel(true);
    setAdminError("");
  };

  const handleBackToPublic = () => {
    setShowAdminPanel(false);
    setAdminError("");
  };

  return (
    <div
      className={`lp-root${fontPhase ? ` lp-font-phase-${fontPhase}` : ""}`}
      data-lang={displayLang}
    >
      <LoginBackground backgrounds={LOGIN_HERO_BACKGROUNDS} activeIndex={activeHeroBg} />

      {/* ── NAVBAR ─────────────────────────────────── */}
      <LoginHeader t={t} showAdminPanel={showAdminPanel} onAdminClick={toggleAdminPanel} />


      {/* ── MAIN SPLIT ─────────────────────────────── */}
      <main className="lp-main">

        {/* LEFT — Hero Content */}
        <LoginHero t={t} />

        {/* RIGHT — Login Card */}
        <LoginCard
          t={t}
          showAdminPanel={showAdminPanel}
          showOtpInput={showOtpInput}
          adminId={adminId}
          setAdminId={setAdminId}
          password={password}
          setPassword={setPassword}
          adminError={adminError}
          isAdminLoggingIn={isAdminLoggingIn}
          handleAdminLogin={handleAdminLogin}
          onBackToPublic={handleBackToPublic}
          phone={phone}
          setPhone={setPhone}
          isSendingOtp={isSendingOtp}
          handlePublicLogin={handlePublicLogin}
          otp={otp}
          setOtp={setOtp}
          timerText={timerText}
          isOtpExpired={isOtpExpired}
          canResendOtp={canResendOtp}
          canVerifyOtp={canVerifyOtp}
          isResendingOtp={isResendingOtp}
          isVerifyingOtp={isVerifyingOtp}
          handleResendOtp={handleResendOtp}
          captchaImage={captchaImage}
          captchaText={captchaText}
          setCaptchaText={setCaptchaText}
          captchaLoading={captchaLoading}
          loadCaptcha={loadCaptcha}
          error={error}
        />

        {/* Live system overview — replaces latest announcements */}
        <LoginLiveOverview t={t} insightsLoading={insightsLoading} cards={liveMetricCards} />
      </main>

      <div className="lp-source-caption-wrap" aria-label="Data source">
        <div className="lp-source-caption">{t("login.imageSourceCaption")}</div>
      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
      <LoginFooter t={t} />
    </div>
  );
}
