import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "../utils/axiosInstance";
import LanguageToggle from "@/components/LanguageToggle";

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
  const [developerMode, setDeveloperMode] = useState(localStorage.getItem("developerMode") === 'true');

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 4) {
      setError(t("login.errInvalidOtp"));
      return;
    }

    try {
      const res = await axiosInstance.post("/otp/verify-otp", {
        phone,
        otp: enteredOtp,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/map");
    } catch (err) {
      setError(err.response?.data?.message || t("login.errOtpFailed"));
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
        const res = await axiosInstance.post("/otp/send-otp", { phone });
        if (res.data.message) {
          setShowOtpInput(true);
        }
      } catch (err) {
        setError(err.response?.data?.message || t("login.errSendFailed"));
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

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("isAdmin", "true");
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || t("login.errBadAdmin"));
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setError("");
  };

  const toggleDeveloperMode = () => {
    const newMode = !developerMode;
    setDeveloperMode(newMode);
    localStorage.setItem("developerMode", newMode ? 'true' : 'false');
  };

  return (
    <div className="lp-root">

      {/* ── NAVBAR ─────────────────────────────────── */}
      <header className="lp-navbar">
        <div className="lp-nav-left">
          <div className="lp-logo-flip" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + "branding/logo-hry.png"} alt="Haryana Logo" />
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
            <div className="lp-stat-card"><h3>144</h3><p>{t("login.statsTehsils")}</p></div>
            <div className="lp-stat-card"><h3>6,812</h3><p>{t("login.statsVillages")}</p></div>
            <div className="lp-stat-card"><h3>3.2Cr+</h3><p>{t("login.statsParcels")}</p></div>
          </div>

        </section>

        {/* RIGHT — Login Card */}
        <aside className="lp-card">
          <div className="lp-logo-flip lp-lock-circle" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + "branding/logo-hry.png"} alt="Haryana Logo" />
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
                    maxLength={10}
                    placeholder={t("login.phonePlaceholder")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                {!showOtpInput ? (
                  <button type="submit" className="lp-btn-green">
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
                          type="text"
                          maxLength="1"
                          className="otp-input"
                          value={digit}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/, "");
                            const newOtp = [...otp];
                            newOtp[index] = value;
                            setOtp(newOtp);
                            if (value && index < 3) {
                              document.getElementById(`otp-${index + 1}`).focus();
                            }
                          }}
                        />
                      ))}
                    </div>

                    <button type="submit" className="lp-btn-green">
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

          <button type="button" className="lp-btn-outline">{t("login.loginGoogle")}</button>

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
