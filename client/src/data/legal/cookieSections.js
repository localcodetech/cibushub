import { CONTACT_EMAIL } from "./legalInfo";

// The Cookies page, one item per section. It matches what the app really stores:
// server/src/utils/auth/cookies.js (login cookies), store/cartStore.js and utils/theme.js.
// If we ever add analytics or advertising cookies, this page must change AND we must ask
// people first (Allow / Deny) before loading them.
export const cookieSections = [
  {
    title: "What cookies are",
    paragraphs: [
      "A cookie is a small piece of text a website saves in your browser, so it remembers you from one page to the next. Websites can also save small settings on your device in a similar way.",
    ],
  },
  {
    title: "The cookies we use",
    paragraphs: [
      "We only use cookies that CibusHub needs to work. Without them you could not stay logged in.",
    ],
    bullets: [
      "access_token: proves you are logged in. It lasts 15 minutes and is renewed while you use the app.",
      "refresh_token: keeps you logged in for up to 7 days, so you don't have to type your password every time. It is only sent when your login is renewed.",
    ],
  },
  {
    title: "How they are protected",
    bullets: [
      "Scripts on the page cannot read them (HttpOnly), so they are hard to steal.",
      "They are only sent over a secure connection (HTTPS).",
      "Other websites cannot use them to act as you.",
      "Logging out deletes them.",
    ],
  },
  {
    title: "What else we save on your device",
    bullets: [
      "Your cart, so it is still there if you close the page.",
      "Your light or dark theme choice.",
      "That you have seen our cookie notice, so it doesn't show again.",
    ],
    paragraphs: [
      "These stay on your device. Your cart is only sent to us when you check it or place an order.",
    ],
  },
  {
    title: "What we don't use",
    paragraphs: [
      "No advertising cookies, no tracking cookies and no analytics cookies. We don't follow you around other websites, and we don't sell your data.",
    ],
  },
  {
    title: "Other services",
    paragraphs: [
      "When you choose to sign in with Google, Apple or Facebook, or pay with Paystack, those services may save their own cookies under their own policies. Our website is also protected by Cloudflare, which may save a security cookie to tell people from bots.",
    ],
  },
  {
    title: "Turning cookies off",
    paragraphs: [
      "You can block or delete cookies in your browser's settings. If you block ours, you won't be able to log in. Clearing your browser's site data also empties your cart and resets your theme.",
    ],
  },
  {
    title: "Questions",
    paragraphs: [`Email us at ${CONTACT_EMAIL}. See also our Privacy Policy.`],
  },
];
