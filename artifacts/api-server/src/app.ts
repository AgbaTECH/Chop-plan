import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { paystackWebhookHandler } from "./routes/webhooks";

const app: Express = express();

// Required for IP-based rate limiting (see lib/rate-limit.ts) to key off the
// real client address instead of Replit's proxy hop. Replit's edge proxy is
// a single hop in front of this service in both dev and production, so `1`
// tells Express to trust exactly the first `X-Forwarded-For` entry rather
// than trusting an arbitrary chain (which would let a client spoof its own
// IP by sending a fake header).
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// This app is served behind Replit's path-based proxy (chop-plan's web app
// and this API share the same origin), so legitimate browser traffic never
// needs cross-origin CORS at all. We still allow the known Replit dev/prod
// domains (comma-separated in REPLIT_DOMAINS) plus localhost, for direct
// API access during local development and preview tooling — but we no
// longer reflect an unrestricted wildcard origin.
const allowedOrigins = new Set(
  (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `https://${d}`)
);
if (process.env.REPLIT_DEV_DOMAIN) {
  allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
}
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://localhost:3000");
}

app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin header (curl, server-to-server, mobile
      // native fetch) aren't subject to CORS in the first place — allow them
      // through and let route-level auth do the real access control.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

// Registered before express.json() so the handler gets the raw request
// Buffer, which is required to verify Paystack's webhook signature.
app.post("/api/webhooks/paystack", express.raw({ type: "*/*" }), paystackWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Final error handler: Express's own default handler renders a stack trace
// as HTML (leaking source file paths), which fires for anything thrown
// synchronously or passed to next() before a route sends its own response —
// notably the CORS origin check above. Replace it with a plain JSON 403/500
// that never echoes internals back to the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
