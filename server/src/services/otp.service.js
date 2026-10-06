import redis from "../config/redis.js";
import AppError from "../utils/AppError.js";
import { generateOtp, hashOtp, otpMatches } from "../utils/otp.js";
import { sendSms } from "./sms.service.js";

const CODE_LIFETIME_SECONDS = 5 * 60;
const RESEND_WAIT_SECONDS = 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_WRONG_ATTEMPTS = 5;

const otpKeys = (purpose, phone) => {
  return {
    code: `otp:${purpose}:${phone}:code`,
    attempts: `otp:${purpose}:${phone}:attempts`,
    cooldown: `otp:${purpose}:${phone}:cooldown`,
    hourly: `otp:${purpose}:${phone}:hourly`,
  };
};

export const sendOtp = async (phone, purpose = "verify") => {
  const keys = otpKeys(purpose, phone);

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

  await redis.set(keys.code, hashOtp(code), "EX", CODE_LIFETIME_SECONDS);
  await redis.del(keys.attempts);
  await redis.set(keys.cooldown, "1", "EX", RESEND_WAIT_SECONDS);

  await sendSms(phone, `Your CibusHub code is ${code}. It expires in 5 minutes.`);
};

export const verifyOtp = async (phone, code, purpose = "verify") => {
  const keys = otpKeys(purpose, phone);

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
