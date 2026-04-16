const express = require("express");
const app = express();

const session = require("express-session");

app.use(
  session({
    secret: "SECRET$123789456",
    name: 'eodb.sid',  
    resave: false,
    saveUninitialized: true,
      cookie: {
       path: '/eodb',
      maxAge:  60 * 60 * 1000, // 2 hours in milliseconds
      httpOnly: true, // prevents client-side JS from accessing the cookie
      secure: false,
      sameSite: 'Strict'
    },
  })
);

const path = require("path");
const axios = require("axios");

require("dotenv").config();

const port = process.env.PORT;
var basePath = process.env.BASEPATH;
var baseURL = process.env.API_BASEURL;

app.use(basePath + "/", express.static(path.join(__dirname)));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { verifyLogin } = require("./middleware/session.middleware");

const rootDirectory = path.join(__dirname, "public");
app.use(express.static(rootDirectory));



const { 
    sessionSecurityCheck, 
    initializeSessionSecurity,
    updateSessionActivity,
    checkSessionTimeout 
} = require("./middleware/sessionSecurity.middleware");


app.use(sessionSecurityCheck({
    checkUserAgent: true,      
    checkFingerprint: true,    
    checkIP: false,            
    strictMode: true,          
    logSuspicious: true        
}));


app.use(updateSessionActivity);


app.use(checkSessionTimeout(30));

app.get(basePath + "", (req, res) => {
  return res.redirect(basePath + "/login");
});
// app.get(basePath + "/login", (req, res) => {
//   return res.sendFile("login.html", { root: rootDirectory });
// });

// app.get(basePath + "/alert", (req, res) => {
//   return res.sendFile("alert.html", { root: rootDirectory });
// });

// var error = "";
// app.get(basePath + "/getError", (req, res) => {
//   console.log(error);
//   if (error) {
//     return res.send({ error: error });
//   } else {
//     return res.status(404).json({ alertMessage: "Data not found" });
//   }
  
// });

///////////////captcha//////////////

const svgCaptcha = require("svg-captcha");
app.get(basePath + "/showCaptcha", (req, res) => {

  const captcha = svgCaptcha.createMathExpr({
    size: 6,
    noise: 0,          // ❌ No lines
    color: false,      // ❌ No text color (black)
    background: "#fff",// white clean background
    width: 180,
    height: 70,
    fontSize: 70,
    mathMin: 1,
    mathMax: 9,
    mathOperator: "+", // You can set "+", "-", or random
  });


  // Set a fixed color of your choice
  const fixedColor = "#0033cc";  // 🔵 change this to any color

 // Replace only path fill NOT rect fill
  captcha.data = captcha.data.replace(
    /<path[^>]*fill="[^"]*"[^>]*>/g,
    (match) => match.replace(/fill="[^"]*"/, `fill="${fixedColor}"`)
  );

  req.session.captcha = captcha.text; // store captcha text in session

  res.type("svg");
  res.status(200).send(captcha.data);
});

///////////////captcha//////////////


app.get(basePath + "/login", (req, res) => {
  return res.sendFile("sendOTP.html", { root: rootDirectory });
});

app.get(basePath + "/verify-OTP", async (req, res) => {
  return res.sendFile("verifyOTP.html", { root: rootDirectory });
});

app.post(basePath + "/sendOTP", async (req, res) => {
  const { mobile, captcha } = req.body;

  if (!req.session.otpAttempts) {
    req.session.otpAttempts = {
      count: 0,
      lastAttemptTime: null,
      blockedUntil: null
    };
  }

  // // ---- Validate CAPTCHA ----
  // if (!captcha) {
  //   return res.status(400).json({ status: false, message: "Captcha required" });
  // }

  // if (captcha !== req.session.captcha) {
  //   return res.status(400).json({ status: false, message: "Invalid Captcha" });
  // }

  const attempts = req.session.otpAttempts;

  // ---- BLOCK CHECK ----
  const now = Date.now();
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    return res.status(429).json({
      status: false,
      message: "Too many OTP attempts. Try again after 1 hour."
    });
  }

  // ---- Check attempt limit ----
  if (attempts.count >= 5) {
    attempts.blockedUntil = now + 60 * 60 * 1000;
    return res.status(429).json({
      status: false,
      message: "Too many OTP requests. Try again after 1 hour."
    });
  }

  try {
    const response = await axios.post(baseURL + "/sendOTP", { mobile });
    console.log(response, "API Response")
    if (response.data.status) {
      attempts.count++;
      attempts.lastAttemptTime = now;

      req.session.mobile = mobile;
      req.session.isLogin = false;

      return res.status(200).json({
        status: true,
        message: "OTP sent successfully"
      });

    } else {
      return res.status(400).json({
        status: false,
        message: response.data.message
      });
    }

  } catch (err) {
    console.log(err, "error in send otp")
    return res.status(err.response?.status || 500).json({
      status: false,
      message: err.response?.data?.message || "Something went wrong"
    });
  }
});


app.post(basePath + "/verifyOTP", async (req, res) => {

  try {
    const { data } = await axios.post(`${baseURL}/verifyOTP`, {
      mobile: req.session.mobile,
      otp: req.body.otp,
      latitude: req.body.latitude,
      longitude: req.body.longitude 
    });

    console.log(data, "verify data")


    if (data.status) {

      // RESET ATTEMPTS
      req.session.otpAttempts = {
        count: 0,
        lastAttemptTime: null,
        blockedUntil: null
      };

      // Security init
      initializeSessionSecurity(req);

      req.session.save((err) => {
        if (err) console.error("Session save error", err);

        req.session.isLogin = true;

        return res.status(200).json({
          status: true,
          message: "OTP verified successfully",
        });
      });

    } else {
      return res.status(400).json({
        status: false,
        message: data.message
      });
    }

  } catch (err) {
    return res.status(err.response?.status || 500).json({
      status: false,
      message: err.response?.data?.message || "Something went wrong"
    });
  }
});


app.get(basePath + "/dashboard",verifyLogin, (req, res) => {
  return res.sendFile("index.html", { root: rootDirectory });
});

// app.post(basePath + "/logout", async (req, res) => {
//   var mobile = req.session.mobile;
//   const cookieName = 'eodb.sid';

//   // Mirror the same cookie options you used in session()
//   const cookieOptions = {
//     path: '/eodb',
//     httpOnly: true,
//     sameSite: 'lax'
//     // domain: 'yourdomain.com' // include only if you configured this when creating the cookie
//   };

//   await axios
//     .post(baseURL + "/logoutUser", {
//       mobile,
//     })
//     .then((data) => {
//       if (data.data.status) {
//         req.session = null;
//         console.log("Msg: " + data.data.message);
//         return res.redirect("/eodb/login");
//       } else {
//         req.session = null;
//         console.log("error: " + data.data.message);
//         return res.redirect("/eodb/login");
//       }
//     });
// });
app.post(basePath + "/logout", async (req, res) => {
  const mobile = req.session.mobile || req.body.mobile;
  const cookieName = "eodb.sid";

  // ⚙️ Mirror the cookie settings used in express-session middleware
  const cookieOptions = {
    path: "/eodb",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // domain: 'yourdomain.com', // only if used when creating the session
  };

  console.log("Logout: incoming Cookie header:", req.headers.cookie);
  console.log("Logout: server-side session cookie info:", req.session?.cookie);

  // Helper function for backend logout (best effort)
  const backendLogout = async () => {
    if (mobile) {
      try {
        const response = await axios.post(baseURL + "/logoutUser", { mobile });
        if (response.data?.status) {
          console.log("Backend logout completed successfully.");
        } else {
          console.warn("Backend logout failed:", response.data?.message);
        }
      } catch (err) {
        console.error("Backend logout API failed:", err.message);
      }
    }
  };

  // ✅ Safely destroy session if available
  if (req.session && typeof req.session.destroy === "function") {
    req.session.destroy(async (err) => {
      if (err) {
        console.error("Error destroying session during logout:", err);
        // Still try to clear cookie and log user out from backend
      }

      // Clear the cookie with the same options
      res.clearCookie(cookieName, cookieOptions);

      // Notify backend (optional best-effort)
      await backendLogout();

      console.log(`User ${mobile || ""} logged out successfully.`);
      return res.redirect(basePath + "/login");
    });
  } else {
    // No active session
    console.warn("No active session found during logout.");

    res.clearCookie(cookieName, cookieOptions);
    await backendLogout();

    return res.redirect(basePath + "/login");
  }
});


app.listen(port, () => {
  console.log(`Server is working on http://localhost:${port}${basePath}`);
});
