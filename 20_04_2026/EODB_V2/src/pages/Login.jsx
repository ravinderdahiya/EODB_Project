import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("otp");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (tab === "password" && !password.trim()) {
      setError("Please enter your password.");
      return;
    }

    // Navigate to dashboard on success
    navigate("/");
  };

  const switchTab = (next) => {
    setTab(next);
    setError("");
  };

  return (
    <div className="lp-root">

      {/* ── NAVBAR ─────────────────────────────────── */}
      <header className="lp-navbar">
        <div className="lp-nav-left">
          <div className="lp-logo-flip" aria-hidden="true">
            <img src="/branding/logo-hry.png" alt="Haryana Logo" />
            <img src="/branding/harsac.png"   alt="HARSAC Logo" />
          </div>
          <div className="lp-logo-text-group">
            <div className="lp-main-title">EODB</div>
            <div className="lp-tagline">Ease of Doing Business</div>
            <div className="lp-sub-title">Haryana</div>
          </div>
        </div>

        <nav className="lp-nav-center" aria-label="Main navigation">
          <span>About</span>
          <span>Services</span>
          <span>Resources</span>
          <span>Help &amp; Support</span>
          <span>Contact</span>
        </nav>

        <div className="lp-nav-right">
          <button className="lp-nav-btn" type="button">English ▾</button>
          <button className="lp-nav-btn" type="button">👁 Guest Access</button>
        </div>
      </header>

      {/* ── MAIN SPLIT ─────────────────────────────── */}
      <main className="lp-main">

        {/* LEFT — Hero Content */}
        <section className="lp-left">
          <div className="lp-badge">● DIGITAL LAND RECORD SYSTEM</div>

          <h1 className="lp-headline">
            <span className="lp-green">Smart. Secure. Simple.</span><br />
            Access Land Records,<br />
            Anytime, Anywhere
          </h1>

          <p className="lp-desc">
            Empowering citizens, farmers, and businesses with digital access
            to cadastral maps and land information.
          </p>

          <div className="lp-stats">
            <div className="lp-stat-card"><h3>22</h3><p>Districts</p></div>
            <div className="lp-stat-card"><h3>144</h3><p>Tehsils</p></div>
            <div className="lp-stat-card"><h3>6,812</h3><p>Villages</p></div>
            <div className="lp-stat-card"><h3>3.2Cr+</h3><p>Parcels</p></div>
          </div>

          {/* Announcements */}
          <div className="lp-announcement">
            <div className="lp-announcement-header">
              <h4>Latest Announcements</h4>
            </div>

            <div className="lp-announcement-item">
              <div className="lp-date-box">
                <span className="lp-month">APR</span>
                <span className="lp-day">22</span>
              </div>
              <div className="lp-announcement-content">
                <h5>Cadastral Map Update: Kaithal and 5 more districts</h5>
                <p>Newly digitized maps are now available for public access.</p>
              </div>
            </div>

            <div className="lp-announcement-item">
              <div className="lp-date-box">
                <span className="lp-month">APR</span>
                <span className="lp-day">18</span>
              </div>
              <div className="lp-announcement-content">
                <h5>System Maintenance</h5>
                <p>Portal under maintenance on April 24, 2:00 AM – 4:00 AM.</p>
              </div>
            </div>

            <div className="lp-view-all">View All Updates →</div>
          </div>
        </section>

        {/* RIGHT — Login Card */}
        <aside className="lp-card">
          <div className="lp-lock-circle" aria-hidden="true">🔒</div>
          <h2 className="lp-card-title">Welcome Back</h2>
          <p className="lp-subtext">
            Login to access your land records and manage your queries securely
          </p>

          {/* Tabs */}
          <div className="lp-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "otp"}
              className={`lp-tab${tab === "otp" ? " lp-tab--active" : ""}`}
              onClick={() => switchTab("otp")}
            >
              OTP Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "password"}
              className={`lp-tab${tab === "password" ? " lp-tab--active" : ""}`}
              onClick={() => switchTab("password")}
            >
              Password Login
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} noValidate>
            <label className="lp-label" htmlFor="lp-phone">
              Registered Mobile Number
            </label>
            <div className="lp-input-row">
              <div className="lp-country">+91 ▾</div>
              <input
                id="lp-phone"
                className="lp-phone-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                autoComplete="tel-national"
              />
            </div>

            {tab === "password" && (
              <>
                <label className="lp-label" htmlFor="lp-password">Password</label>
                <input
                  id="lp-password"
                  className="lp-full-input"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </>
            )}

            {error && (
              <p className="lp-error" role="alert">{error}</p>
            )}

            <button type="submit" className="lp-btn-green">
              {tab === "otp" ? "✈ Send OTP" : "🔐 Login"}
            </button>
          </form>

          <div className="lp-divider" aria-hidden="true">
            <span /><span>OR</span><span />
          </div>

          <button type="button" className="lp-btn-outline">🛡 Login with SSO</button>
          <button type="button" className="lp-btn-outline">📁 Login with DigiLocker</button>

          <p className="lp-terms">
            By continuing, you agree to our{" "}
            <span role="button" tabIndex={0}>Terms of Service</span> and{" "}
            <span role="button" tabIndex={0}>Privacy Policy</span>.
          </p>
        </aside>
      </main>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-feature">
            <span className="lp-feature-icon">🔒</span>
            <div><h5>100% Secure</h5><p>256-bit SSL Encryption</p></div>
          </div>
          <div className="lp-feature">
            <span className="lp-feature-icon">📈</span>
            <div><h5>Real-time Access</h5><p>Live Data Updates</p></div>
          </div>
          <div className="lp-feature">
            <span className="lp-feature-icon">✨</span>
            <div><h5>Easy to Use</h5><p>Simple &amp; Intuitive Interface</p></div>
          </div>
          <div className="lp-feature">
            <span className="lp-feature-icon">⏱</span>
            <div><h5>Always Available</h5><p>24/7 Access</p></div>
          </div>
          <div className="lp-help">
            <div>
              <h5>Need Help?</h5>
              <p>1800-XXX-XXXX | support@harsac.gov.in</p>
            </div>
            <button type="button" className="lp-chat-btn">💬 Chat with Us</button>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>© 2026 HARSAC — Haryana Space Applications Centre. All rights reserved.</p>
          <div className="lp-socials" aria-label="Social links">
            <span title="Facebook">f</span>
            <span title="X / Twitter">X</span>
            <span title="YouTube">▶</span>
            <span title="LinkedIn">in</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
