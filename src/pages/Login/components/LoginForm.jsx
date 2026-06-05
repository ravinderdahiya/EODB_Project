import { Loader2, RefreshCw } from "lucide-react";
import "./LoginForm.css";

export default function LoginForm({
  t,
  showAdminPanel,
  showOtpInput,
  // admin
  adminId,
  setAdminId,
  password,
  setPassword,
  adminError,
  isAdminLoggingIn,
  handleAdminLogin,
  onBackToPublic,
  // public
  phone,
  setPhone,
  isSendingOtp,
  handlePublicLogin,
  // otp
  otp,
  setOtp,
  timerText,
  isOtpExpired,
  canResendOtp,
  canVerifyOtp,
  isResendingOtp,
  isVerifyingOtp,
  handleResendOtp,
  // captcha
  captchaImage,
  captchaText,
  setCaptchaText,
  captchaLoading,
  loadCaptcha,
  // shared
  error,
}) {
  const renderCaptchaField = () => (
    <div className="lp-captcha">
      <label className="lp-label" htmlFor="lp-captcha-input">
        {t("login.captchaLabel")}
      </label>
      <div className="lp-captcha-row">
        <div className="lp-captcha-image" aria-live="polite">
          {captchaImage ? (
            <img src={captchaImage} alt={t("login.captchaImageAlt")} draggable={false} />
          ) : (
            <span className="lp-captcha-placeholder">
              {captchaLoading ? "…" : "—"}
            </span>
          )}
        </div>
        <button
          type="button"
          className="lp-captcha-refresh"
          onClick={loadCaptcha}
          disabled={captchaLoading}
          title={t("login.captchaRefresh")}
          aria-label={t("login.captchaRefresh")}
        >
          <RefreshCw className={captchaLoading ? "lp-captcha-spin" : ""} size={18} />
        </button>
      </div>
      <input
        id="lp-captcha-input"
        className="lp-full-input"
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={8}
        placeholder={t("login.captchaPlaceholder")}
        value={captchaText}
        onChange={(e) => setCaptchaText(e.target.value)}
      />
    </div>
  );

  if (showAdminPanel) {
    return (
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

        {renderCaptchaField()}

        {adminError && <p className="lp-error">{adminError}</p>}

        <button type="submit" className="lp-btn-green" disabled={isAdminLoggingIn}>
          {t("login.adminLoginBtn")}
        </button>
        <button
          type="button"
          className="lp-btn-outline lp-back-public-btn"
          onClick={onBackToPublic}
        >
          Back to Public Login
        </button>
      </form>
    );
  }

  return (
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

          {renderCaptchaField()}

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
  );
}
