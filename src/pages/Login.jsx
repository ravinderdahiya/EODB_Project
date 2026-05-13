import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "../utils/axiosInstance";
import LanguageToggle from "@/components/LanguageToggle";
import { encrypt } from "../utils/crypto";
import { reloadRuntimeConfig } from "@/config/runtimeConfig";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [tab, setTab] = useState("otp");
  const [phone, setPhone] = useState("");
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

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
      const res = await axiosInstance.post("/otp/verify-otp", {
        phone,
        otp: enteredOtp,
      });

      localStorage.setItem("token", encrypt(res.data.token));
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("isAdmin", "false");
      sessionStorage.setItem("isAuthenticated", "true");
      await reloadRuntimeConfig();
      navigate("/map");
    } catch (err) {
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
      const res = await axiosInstance.post("/otp/resend-otp", { phone });
      if (res.data.message) {
        setOtp(["", "", "", ""]);
        setOtpTimer(120);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("login.errSendFailed"));
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (tab === "otp") {
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
        const res = await axiosInstance.post("/otp/send-otp", { phone });
        if (res.data.message) {
          setShowOtpInput(true);
          setOtp(["", "", "", ""]);
          setOtpTimer(120);
        }
      } catch (err) {
        setError(err.response?.data?.message || t("login.errSendFailed"));
      } finally {
        setIsSendingOtp(false);
      }

      return;
    }

    // Admin login via API
    if (!adminId.trim() || !password.trim()) {
      setError(t("login.errBadAdmin"));
      return;
    }

    try {
      const res = await axiosInstance.post("/user/admin-login", {
        adminId,
        password
      });


      localStorage.setItem("token", encrypt(res.data.token));
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("isAdmin", "true");
      sessionStorage.setItem("isAuthenticated", "true");
      await reloadRuntimeConfig();
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || t("login.errBadAdmin"));
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setError("");
    if (next !== "otp") {
      setShowOtpInput(false);
      setOtp(["", "", "", ""]);
      setOtpTimer(0);
    }
  };

  const handleGoogleSignIn = async (response) => {
    if (!response?.credential) {
      setError(t("login.errGoogleFailed"));
      return;
    }

    try {
      const res = await axiosInstance.post("/user/google-login", {
        credential: response.credential,
      });

      const token = res.data?.token;
      const user = res.data?.user;

      if (!token || !user) {
        throw new Error("Google login failed");
      }

      localStorage.setItem("token", encrypt(token));
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isAdmin", user.role === "admin" || user.role === "superadmin" ? "true" : "false");
      sessionStorage.setItem("isAuthenticated", "true");
      await reloadRuntimeConfig();
      navigate("/map");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t("login.errGoogleFailed"));
    }
  };

  const initializeGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleSignIn,
      ux_mode: "popup",
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let intervalId = null;
    const tryInitialize = () => {
      if (window.google?.accounts?.id) {
        initializeGoogle();
        if (intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    tryInitialize();
    intervalId = window.setInterval(tryInitialize, 100);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const handleGoogleLoginClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google client ID is not configured. Add VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    if (!window.google?.accounts?.id) {
      setError(t("login.errGoogleNotReady"));
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError(t("login.errGooglePrompt"));
      }
    });
  };

  return (
    <div className="lp-root">

      {/* ── NAVBAR ─────────────────────────────────── */}
      <header className="lp-navbar">
        <div className="lp-nav-left">
          <div className="lp-logo-flip" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + "branding/Emblem_of_Haryana.svg"} alt="Haryana Logo" />
            <img src={import.meta.env.BASE_URL + "branding/harsac.png"}   alt="HARSAC Logo" />
          </div>
          <div className="lp-logo-text-group">
            <div className="lp-main-title">EODB</div>
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
          />
          <button type="button" className="lp-chat-btn">{t("login.chatBtn")}</button>
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
            <div className="lp-stat-card"><h3>94</h3><p>{t("login.statsTehsils")}</p></div>
            <div className="lp-stat-card"><h3>6,812</h3><p>{t("login.statsVillages")}</p></div>
            <div className="lp-stat-card"><h3>3.2Cr+</h3><p>{t("login.statsParcels")}</p></div>
          </div>

        </section>

        {/* RIGHT — Login Card */}
        <aside className="lp-card">
          <div className="lp-logo-flip lp-lock-circle" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + "branding/Emblem_of_Haryana.svg"} alt="Haryana Logo" />
            <img src={import.meta.env.BASE_URL + "branding/harsac.png"}   alt="HARSAC Logo" />
          </div>

          <h2 className="lp-card-title">{t("login.cardTitle")}</h2>
          <p className="lp-subtext">{t("login.cardSubtitle")}</p>

          {/* Tabs */}
          <div className="lp-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "otp"}
              className={`lp-tab${tab === "otp" ? " lp-tab--active" : ""}`}
              onClick={() => switchTab("otp")}
            >
              {t("login.tabOtp")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "admin"}
              className={`lp-tab${tab === "admin" ? " lp-tab--active" : ""}`}
              onClick={() => switchTab("admin")}
            >
              {t("login.tabAdmin")}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} noValidate>
            {tab === "otp" ? (
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

                {!showOtpInput ? (
                  <button type="submit" className="lp-btn-green" disabled={isSendingOtp}>
                    {t("login.sendOtp")}
                  </button>
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
                          autoComplete={index === 0 ? "one-time-code" : "off"}
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
                        disabled={!canResendOtp}
                        onClick={handleResendOtp}
                      >
                        {canResendOtp
                          ? t("login.resendOtp")
                          : `${t("login.resendOtpIn")} ${timerText}`}
                      </button>
                    </div>

                    <button type="submit" className="lp-btn-green" disabled={!canVerifyOtp}>
                      {t("login.verifyOtp")}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <label className="lp-label">{t("login.adminIdLabel")}</label>
                <input
                  className="lp-full-input"
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                />

                <label className="lp-label">{t("login.passwordLabel")}</label>
                <input
                  className="lp-full-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit" className="lp-btn-green">
                  {t("login.adminLoginBtn")}
                </button>
              </>
            )}

            {error && <p className="lp-error">{error}</p>}

           
          </form>

          <div className="lp-divider" aria-hidden="true">
            <span /><span>{t("login.or")}</span><span />
          </div>

          <button
            type="button"
            className="lp-btn-outline"
            onClick={handleGoogleLoginClick}
          >
            {t("login.loginGoogle")}
          </button>

          <p className="lp-terms">
            {t("login.termsText")}{" "}
            <span role="button" tabIndex={0}>{t("login.termsTos")}</span>{" "}
            {t("login.termsAnd")}{" "}
            <span role="button" tabIndex={0}>{t("login.termsPrivacy")}</span>.
          </p>
        </aside>

        {/* Announcements — separate grid child so order can differ per breakpoint */}
        <div className="lp-announcement">
          <div className="lp-announcement-header">
            <h4>{t("login.announcementsTitle")}</h4>
          </div>

          <div className="lp-announcement-item">
            <div className="lp-date-box">
              <span className="lp-month">{new Date().toLocaleString("default", { month: "short" }).toUpperCase()}</span>
              <span className="lp-day"> {new Date().getDate()}</span>
            </div>
            <div className="lp-announcement-content">
              <h5>Cadastral Map Update: Kaithal and 5 more districts</h5>
              <p>Newly digitized maps are now available for public access.</p>
            </div>
          </div>

          <div className="lp-announcement-item">
            <div className="lp-date-box">
              <span className="lp-month">{new Date().toLocaleString("default", { month: "short" }).toUpperCase()}</span>
              <span className="lp-day"> {new Date().getDate()}</span>
            </div>
            <div className="lp-announcement-content">
              <h5>Running Project</h5>
              <p>EODB (Ease of Doing Business) platform is currently under active development,
                including GIS mapping, and admin dashboard modules.</p>
            </div>
          </div>

          <div className="lp-view-all">{t("login.viewAll")}</div>
        </div>
      </main>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-top" />
        <div className="lp-footer-bottom">
          <p>{t("login.copyright")}</p>
          <div className="lp-socials" aria-label="Social links" />
        </div>
      </footer>
    </div>
  );
}
