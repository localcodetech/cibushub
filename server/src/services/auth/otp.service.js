import redis from "../../config/redis.js";
import AppError from "../../utils/AppError.js";
import { generateOtp, hashOtp, otpMatches } from "../../utils/auth/otp.js";
import { notify } from "../notifications/notify.service.js";

const OTP_PURPOSES = {
  verify: {
    lifetimeSeconds: 5 * 60,
    message: (code) => `Your CibusHub code is ${code}. It expires in 5 minutes.`,
  },
  reset: {
    lifetimeSeconds: 15 * 60,
    message: (code) =>
      `Your CibusHub password reset code is ${code}. It expires in 15 minutes. Ignore this if you did not ask.`,
  },
  // Sent to the NEW phone number, to prove the user owns it [AC-CUST-02]
  changePhone: {
    lifetimeSeconds: 5 * 60,
    message: (code) =>
      `Your CibusHub code is ${code}. Use it to confirm your new phone number. It expires in 5 minutes.`,
  },
  // Sent to the NEW email address [AC-CUST-02]
  changeEmail: {
    channel: "email",
    lifetimeSeconds: 15 * 60,
    subject: "Confirm your new CibusHub email",
    message: (code) =>
      `Your CibusHub code is ${code}. Use it to confirm your new email address. It expires in 15 minutes.`,
  },
};

const RESEND_WAIT_SECONDS = 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_WRONG_ATTEMPTS = 5;

// destination is a phone number, or an email address for the "changeEmail" purpose
const otpKeys = (purpose, destination) => {
  return {
    code: `otp:${purpose}:${destination}:code`,
    attempts: `otp:${purpose}:${destination}:attempts`,
    cooldown: `otp:${purpose}:${destination}:cooldown`,
    hourly: `otp:${purpose}:${destination}:hourly`,
  };
};

export const sendOtp = async (destination, purpose = "verify") => {
  const settings = OTP_PURPOSES[purpose];
  if (!settings) {
    throw new Error(`Unknown OTP purpose: ${purpose}`);
  }

  const keys = otpKeys(purpose, destination);

  const secondsToWait = await redis.ttl(keys.cooldown);
  if (secondsToWait > 0) {
    throw new AppError(
      429,
      "RATE_LIMITED",
      `Please wait ${secondsToWait} seconds before requesting a new code`,
      [{ retryAfterSeconds: secondsToWait }],
    );
  }

  const codesSentThisHour = await redis.incr(keys.hourly);
  if (codesSentThisHour === 1) {
    await redis.expire(keys.hourly, 60 * 60);
  }
  if (codesSentThisHour > MAX_CODES_PER_HOUR) {
    throw new AppError(429, "RATE_LIMITED", "Too many codes requested. Please try again later");
  }

  const code = generateOtp();

  await redis.set(keys.code, hashOtp(code), "EX", settings.lifetimeSeconds);
  await redis.del(keys.attempts);
  await redis.set(keys.cooldown, "1", "EX", RESEND_WAIT_SECONDS);

  // Sent in the background, like every message; never stored anywhere but the job [AC-NOTIF-02]
  await notify({
    channel: settings.channel === "email" ? "EMAIL" : "SMS",
    to: destination,
    template: `otp.${purpose}`,
    subject: settings.subject,
    text: settings.message(code),
  });
};

export const verifyOtp = async (destination, code, purpose = "verify") => {
  const keys = otpKeys(purpose, destination);

  const wrongAttempts = Number(await redis.get(keys.attempts));
  if (wrongAttempts >= MAX_WRONG_ATTEMPTS) {
    throw new AppError(
      429,
      "OTP_ATTEMPTS_EXCEEDED",
      "Too many wrong attempts. Please request a new code",
    );
  }

  const savedHash = await redis.get(keys.code);
  if (!savedHash) {
    throw new AppError(400, "OTP_EXPIRED", "This code has expired. Please request a new code");
  }

  if (!otpMatches(code, savedHash)) {
    const attemptsSoFar = await redis.incr(keys.attempts);
    await redis.expire(keys.attempts, 60 * 60);

    if (attemptsSoFar >= MAX_WRONG_ATTEMPTS) {
      await redis.del(keys.code);
      throw new AppError(
        429,
        "OTP_ATTEMPTS_EXCEEDED",
        "Too many wrong attempts. Please request a new code",
      );
    }

    const attemptsLeft = MAX_WRONG_ATTEMPTS - attemptsSoFar;
    throw new AppError(400, "OTP_INVALID", `Incorrect code. ${attemptsLeft} attempts left`);
  }

  await redis.del(keys.code, keys.attempts);
};
