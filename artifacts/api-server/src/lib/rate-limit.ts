import rateLimit from "express-rate-limit";

// Applied to login endpoints: generous enough for normal typos/retries, but
// caps brute-force password guessing against a single IP. Keyed by IP only
// (not email) since express-rate-limit v8's default keying is IP-based and
// this is meant as a coarse first line of defense, not the only one — OTP
// codes and bcrypt cost already slow down anything that gets past this.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
});

// Applied to signup endpoints: prevents mass account creation from a single
// IP (e.g. spam signups, email-bombing via signup-triggered OTP emails).
export const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts from this network. Please try again later." },
});

// Applied to forgot-password / resend-otp endpoints: these already have a
// per-account 60s resend cooldown (see lib/otp.ts), but that's keyed by
// account, not IP — this stops one IP from hammering many different email
// addresses.
export const otpRequestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many code requests. Please try again in a few minutes." },
});

// Applied to verify-code / reset-password endpoints: a 6-digit code has only
// 1,000,000 possibilities, and the 60s resend cooldown in lib/otp.ts doesn't
// limit how many *guesses* can be made against the current code before it
// expires — this bounds that directly.
export const otpVerifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please request a new code and try again." },
});

// Applied to withdrawal requests: withdrawals move real money via Paystack
// transfers, so this bounds how many attempts a single vendor session's IP
// can fire even if a bug or malicious script tries to hammer the endpoint.
export const withdrawalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many withdrawal attempts. Please try again in a few minutes." },
});
