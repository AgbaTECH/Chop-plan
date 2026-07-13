import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { paystackWebhookHandler } from "./routes/webhooks";

const app: Express = express();

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
app.use(cors());

// Registered before express.json() so the handler gets the raw request
// Buffer, which is required to verify Paystack's webhook signature.
app.post("/api/webhooks/paystack", express.raw({ type: "*/*" }), paystackWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
