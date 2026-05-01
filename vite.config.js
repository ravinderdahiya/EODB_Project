import path from "node:path";
import https from "node:https";
import os from "node:os";
import { execFile } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const HSAC_PROXY_ALLOWED_HOSTS = new Set([
  "hsac.org.in",
  "hsacggm.in",
  "onemapggm.gmda.gov.in",
]);

function normalizeLocalProxyPath(pathname) {
  if (!pathname) return "/__hsac_proxy__";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function isSameLocalProxyPath(pathname, localProxyPath) {
  if (pathname === localProxyPath) return true;
  if (!pathname.endsWith(localProxyPath)) return false;
  const prefix = pathname.slice(0, -localProxyPath.length);
  return prefix === "" || prefix.startsWith("/");
}

function installLocalHsacProxyMiddleware(server, proxyPath, upstreamProxyUrl) {
  const localProxyPath = normalizeLocalProxyPath(proxyPath);

  server.middlewares.use((req, res, next) => {
    const requestUrl = req.url ?? "";
    const separatorIndex = requestUrl.indexOf("?");

    if (separatorIndex < 0) return next();

    const pathname = requestUrl.slice(0, separatorIndex);
    if (!isSameLocalProxyPath(pathname, localProxyPath)) return next();

    const rawTarget = requestUrl.slice(separatorIndex + 1);
    if (!rawTarget) {
      res.statusCode = 400;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Missing target URL.");
      return;
    }

    let targetUrl = rawTarget;
    if (/^https?%3A%2F%2F/i.test(targetUrl)) {
      try {
        targetUrl = decodeURIComponent(targetUrl);
      } catch {
        res.statusCode = 400;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Malformed encoded target URL.");
        return;
      }
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      res.statusCode = 400;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Invalid target URL.");
      return;
    }

    if (parsed.protocol !== "https:" || !HSAC_PROXY_ALLOWED_HOSTS.has(parsed.hostname)) {
      res.statusCode = 403;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Target host is not allowed.");
      return;
    }

    const method = (req.method ?? "GET").toUpperCase();
    const requestChunks = [];

    req.on("data", (chunk) => {
      requestChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("error", () => {
      if (res.headersSent) return;
      res.statusCode = 502;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Failed to read request body.");
    });

    req.on("end", () => {
      const requestBody = requestChunks.length > 0 ? Buffer.concat(requestChunks) : Buffer.alloc(0);
      const tempSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const tempResponseFile = path.join(os.tmpdir(), `hsac-local-proxy-res-${tempSuffix}.bin`);
      const tempRequestFile = path.join(os.tmpdir(), `hsac-local-proxy-req-${tempSuffix}.bin`);
      const targetThroughHsacProxy = `${upstreamProxyUrl}?${encodeURIComponent(targetUrl)}`;

      void (async () => {
        if (requestBody.length > 0) {
          await writeFile(tempRequestFile, requestBody);
        }

        const curlArgs = [
          "-sS",
          "-L",
          "--connect-timeout",
          "20",
          "--max-time",
          "120",
          "-H",
          "Connection: close",
        ];

        if (method !== "GET" && method !== "HEAD") {
          curlArgs.push("-X", method);
          const contentType = req.headers["content-type"];
          if (contentType) {
            curlArgs.push("-H", `Content-Type: ${contentType}`);
          }
          if (requestBody.length > 0) {
            curlArgs.push("--data-binary", `@${tempRequestFile}`);
          }
        }

        curlArgs.push(
          "-o",
          tempResponseFile,
          "-w",
          "%{http_code}\n%{content_type}",
          targetThroughHsacProxy,
        );

        execFile("curl", curlArgs, { maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
          void (async () => {
            let responseBody = Buffer.alloc(0);
            try {
              responseBody = await readFile(tempResponseFile);
            } catch {
              responseBody = Buffer.alloc(0);
            } finally {
              await unlink(tempResponseFile).catch(() => undefined);
              await unlink(tempRequestFile).catch(() => undefined);
            }

            const [statusLine = "", contentTypeLine = ""] = `${stdout ?? ""}`
              .trim()
              .split(/\r?\n/);
            const statusCode = Number.parseInt(statusLine, 10);
            const contentType = contentTypeLine && contentTypeLine !== "null"
              ? contentTypeLine
              : "application/octet-stream";

            if (!Number.isFinite(statusCode)) {
              res.statusCode = 502;
              res.setHeader("content-type", "text/plain; charset=utf-8");
              res.end(
                `Local proxy failed to parse upstream response.\n${stderr || error?.message || ""}`,
              );
              return;
            }

            res.statusCode = statusCode;
            res.setHeader("content-type", contentType);
            res.setHeader("cache-control", "no-store");
            res.end(responseBody);
          })().catch(() => {
            res.statusCode = 502;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Local HSAC proxy request failed.");
          });
        });
      })().catch(() => {
        res.statusCode = 502;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Failed to forward request body.");
      });
    });
  });
}

export default defineConfig(({ mode }) => {
  // Load .env variables into Node context so vite.config.js can reference them.
  // Third arg "" loads ALL vars, not just VITE_* prefixed ones.
  const env = loadEnv(mode, process.cwd(), "");

  const hsacTarget = env.VITE_HSAC_ORIGIN    || "https://hsac.org.in";
  const hsacProxy  = env.VITE_HSAC_DEV_PROXY || "/hsac";
  const hsacAgent  = new https.Agent({ keepAlive: false });
  const hsacDotNetProxyUpstream = env.VITE_HSAC_DOTNET_PROXY_URL || "https://hsac.org.in/DotNet/proxy.ashx";
  const hsacDotNetDevProxyPath = normalizeLocalProxyPath(
    env.VITE_HSAC_DOTNET_PROXY_DEV_URL || "/__hsac_proxy__",
  );
  const devPort    = parseInt(env.VITE_DEV_PORT || "5173", 10);
  const baseURL    = env.VITE_SERVER_BASE_URL || "http://localhost:8080";
  const rawBase    = env.VITE_BASENAME || "/";
  const base       = rawBase.endsWith("/") ? rawBase : rawBase + "/";
  return {
    base,
    plugins: [
      react(),
      {
        name: "local-hsac-dotnet-proxy",
        configureServer(server) {
          installLocalHsacProxyMiddleware(server, hsacDotNetDevProxyPath, hsacDotNetProxyUpstream);
        },
        configurePreviewServer(server) {
          installLocalHsacProxyMiddleware(server, hsacDotNetDevProxyPath, hsacDotNetProxyUpstream);
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: devPort,
      proxy: {
        // Backend API proxy for user/auth routes
        "/user": {
          target: baseURL,
          changeOrigin: true,
          secure: false,
        },
        // Backend API proxy for OTP routes
        "/otp": {
          target: baseURL,
          changeOrigin: true,
          secure: false,
        },
        // ArcGIS REST proxy (dev only): VITE_HSAC_DEV_PROXY/... -> VITE_HSAC_ORIGIN/...
        [hsacProxy]: {
          target: hsacTarget,
          changeOrigin: true,
          secure: false,
          agent: hsacAgent,
          headers: { Connection: "close" },
          rewrite: (p) => p.replace(new RegExp(`^${hsacProxy}`), ""),
        },
        // CORS proxy for HSAC ASMX land-record services (khewat / khatoni / owner names).
        // Vite rewrites /LandOwnerAPI/... → VITE_HSAC_ORIGIN/LandOwnerAPI/...
        // In production configure the equivalent rule in Nginx / Apache.
        "/LandOwnerAPI": {
          target:       hsacTarget,
          changeOrigin: true,
          secure:       false,
        },
        // Jamabandi data endpoint (getjamabandi.asmx)
        "/testapi": {
          target:       hsacTarget,
          changeOrigin: true,
          secure:       false,
        },
      },
    },
    // Same proxy rules for `npm run preview` (serves the built output on localhost).
    // Without this, browser requests to hsac.org.in cross the origin boundary and CORS blocks them.
    // In production the app is served from hsac.org.in itself so CORS never applies.
    preview: {
      proxy: {
        // Backend API proxy for user/auth routes
        "/user": {
          target: baseURL,
          changeOrigin: true,
          secure: false,
        },
        // Backend API proxy for OTP routes
        "/otp": {
          target: baseURL,
          changeOrigin: true,
          secure: false,
        },
        [hsacProxy]: {
          target: hsacTarget,
          changeOrigin: true,
          secure: false,
          agent: hsacAgent,
          headers: { Connection: "close" },
          rewrite: (p) => p.replace(new RegExp(`^${hsacProxy}`), ""),
        },
        "/LandOwnerAPI": {
          target:       hsacTarget,
          changeOrigin: true,
          secure:       false,
        },
        "/testapi": {
          target:       hsacTarget,
          changeOrigin: true,
          secure:       false,
        },
      },
    },
  };
});
