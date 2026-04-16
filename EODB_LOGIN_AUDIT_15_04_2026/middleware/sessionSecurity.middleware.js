const crypto = require("crypto");
const axios = require("axios");

function generateFingerprint(req) {
  const userAgent = req.headers["user-agent"] || "";
  const acceptLanguage = req.headers["accept-language"] || "";
  const acceptEncoding = req.headers["accept-encoding"] || "";

  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;

  // Hash the fingerprint for security (don't store raw data)
  return crypto.createHash("sha256").update(fingerprintData).digest("hex");
}

function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.headers["x-real-ip"] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
}

exports.sessionSecurityCheck = (options = {}) => {
  const { checkUserAgent = true, checkIP = true, checkFingerprint = true, strictMode = true, logSuspicious = true } = options;

  return (req, res, next) => {
    // Skip check if no session or not logged in
    if (!req.session || !req.session.isLoggedIn) {
      return next();
    }

    const currentUA = req.headers["user-agent"] || "";
    const currentIP = getClientIP(req);
    const currentFingerprint = generateFingerprint(req);

    // If session security not initialized yet, initialize it now and continue
    // This handles the first request after login
    if (!req.session.userAgent || !req.session.fingerprint) {
      req.session.userAgent = currentUA;
      req.session.ipAddress = currentIP;
      req.session.fingerprint = currentFingerprint;
      console.log("🔒 Session security auto-initialized on first request");
      return next();
    }

    let suspicious = false;
    let reasons = [];

    // Check User-Agent
    if (checkUserAgent) {
      if (req.session.userAgent !== currentUA) {
        suspicious = true;
        reasons.push("User-Agent mismatch");
      }
    }

    // Check IP Address
    if (checkIP) {
      if (req.session.ipAddress !== currentIP) {
        suspicious = true;
        reasons.push("IP address changed");
      }
    }

    // Check Browser Fingerprint
    if (checkFingerprint) {
      if (req.session.fingerprint !== currentFingerprint) {
        suspicious = true;
        reasons.push("Browser fingerprint mismatch");
      }
    }

    // --- HANDLE SUSPICIOUS ACTIVITY ---
    if (suspicious) {
      if (logSuspicious) {
        console.warn("⚠️  SUSPICIOUS SESSION ACTIVITY DETECTED:", {
          sessionID: req.sessionID,
          mobile: req.session.mobile,
          reasons: reasons,
          stored: {
            ua: req.session.userAgent?.substring(0, 50),
            ip: req.session.ipAddress,
            fingerprint: req.session.fingerprint?.substring(0, 16),
          },
          current: {
            ua: currentUA.substring(0, 50),
            ip: currentIP,
            fingerprint: currentFingerprint.substring(0, 16),
          },
          timestamp: new Date().toISOString(),
        });
      }

      // In strict mode, destroy session immediately
      if (strictMode) {
        const BASE_PATH = req.app.locals.BASE_PATH || process.env.BASE_PATH || "";

        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
          }
          // Clear the correct cookie name
          res.clearCookie("dipr.sid");
          res.clearCookie("connect.sid"); // Fallback

          // Redirect to login instead of JSON response for web apps
          return res.redirect(BASE_PATH + "/login?error=session_hijack");
        });
        return;
      }
    }

    next();
  };
};

exports.initializeSessionSecurity = (req) => {
  req.session.userAgent = req.headers["user-agent"] || "";
  req.session.ipAddress = getClientIP(req);
  req.session.fingerprint = generateFingerprint(req);
  req.session.createdAt = new Date().toISOString();
  req.session.lastActivity = new Date().toISOString();

  console.log("🔒 Session security initialized:", {
    sessionID: req.sessionID,
    ip: req.session.ipAddress,
    ua: req.session.userAgent.substring(0, 50) + "...",
    fingerprint: req.session.fingerprint.substring(0, 16) + "...",
  });
};

exports.updateSessionActivity = (req, res, next) => {
  if (req.session && req.session.isLoggedIn) {
    req.session.lastActivity = new Date().toISOString();
  }
  next();
};

exports.checkSessionTimeout = (maxIdleMinutes = 30) => {
  return (req, res, next) => {
    if (!req.session || !req.session.isLoggedIn || !req.session.lastActivity) {
      return next();
    }

    const lastActivity = new Date(req.session.lastActivity);
    const now = new Date();
    const idleMinutes = (now - lastActivity) / 1000 / 60;

    if (idleMinutes > maxIdleMinutes) {
      const BASE_PATH = req.app.locals.BASE_PATH || process.env.BASE_PATH || "";

      console.log(`⏱️  Session timeout for ${req.session.mobile}: ${idleMinutes.toFixed(1)} minutes idle`);

      req.session.destroy((err) => {
        if (err) console.error("Session destruction error:", err);
        res.clearCookie("dipr.sid");
        res.clearCookie("connect.sid"); // Fallback
        return res.redirect(BASE_PATH + "/login?timeout=1");
      });
      return;
    }

    next();
  };
};

// exports.geoAccessIndiaOnly = async (req, res, next) => {
//   try {
//     // Restricted countries
//     const restrictedCountries = [
//       "RUS", // Russia
//       "CHN", // China
//       "IRN", // Iran
//       "PAK", // Pakistan
//       "AFG", // Afghanistan
//       "PRK", // North Korea
//       "SYR", // Syria
//       "SDN", // Sudan
//       "CUB", // Cuba
//     ];

//     // Extract IP
//     let ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.headers["x-real-ip"] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;

//     // Detect private/local IP → require auto-detection
//     const privateIP = /^(::1|127\.|10\.|172\.(1[6-9]|2\d|3[0-1])|192\.168\.)/;
//     if (privateIP.test(ip)) {
//       console.log("Local/Private IP detected, using auto IP lookup");
//       ip = "";
//     }

//     // API URL
//     const url = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`;

//     const response = await axios.get(url);

//     // ipapi provides 2 formats:
//     // country: "IN"
//     // country_name: "India"
//     // country_code_iso3: "IND"
//     // We use 3-letter ISO for accuracy
//     const countryISO3 = response.data.country_code_iso3; // "IND"

//     console.log("Country:", countryISO3);

//     // If lookup fails → deny for safety
//     // if (!countryISO3) {
//     //   return res.status(403).send("Access blocked: Unable to determine region.");
//     // }

//     // Check if country is restricted
//     if (restrictedCountries.includes(countryISO3)) {
//       console.log("Access denied:", { ip, countryISO3 });
//       return res.status(403).send("Access blocked: Your region is restricted.");
//     }

//     // Allow everyone else
//     next();
//   } catch (err) {
//     // console.error("Geo check failed:", err);
//     // return res.status(500).send("Server Error. Please try again later.");
//     next();
//   }
// };

exports.verifyBackendSession = () => {
  return async (req, res, next) => {
    // Skip if not logged in
    if (!req.session || !req.session.isLoggedIn) {
      return next();
    }

    const mobile = req.session.mobile;
    const token = req.session.token;

    // Missing auth data
    if (!mobile || !token) {
      return destroyAndRedirect(req, res, "missing_auth");
    }

    try {
      const data = await axios.post(process.env.API_BASEURL + "/getUserData", { mobile, token });
      // Token valid → continue
      return next();
    } catch (err) {
      // Token expired / invalid
      if (err.response?.status === 401) {
        console.warn("Backend token invalid / expired:", {
          mobile,
          sessionID: req.sessionID,
        });

        return destroyAndRedirect(req, res);
      }
      // Other backend errors → allow request or block (your choice)
      //   console.error("Backend auth check failed:", err.message);
      return next();
    }
  };
};

/* Helper: destroy session + redirect */
function destroyAndRedirect(req, res) {
  const BASE_PATH = process.env.BASEPATH || "/eodb";
  const COOKIE_NAME = "eodb.sid";

  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);

    res.clearCookie(COOKIE_NAME, {
      path: "/eodb",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.redirect(`${BASE_PATH}`);
  });
}
