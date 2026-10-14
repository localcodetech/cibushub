import { CONTACT_EMAIL } from "./legalInfo";

// The Data Deletion page, one item per section. Meta requires a public page like this before
// Facebook Login can go live. It matches what the app really does: docs/account-deletion.md
export const dataDeletionSections = [
  {
    title: "Delete your account in the app",
    bullets: [
      "Log in and open My profile.",
      "Scroll to Delete my account.",
      "Enter your password. If you signed up with Google, Apple or Facebook and have no password, leave it empty.",
      "Type DELETE and confirm.",
    ],
    paragraphs: [
      "Your account is deleted straight away, you are logged out on every device, and we send a last message to confirm it.",
    ],
  },
  {
    title: "Can't log in? Ask us by email",
    paragraphs: [
      `Email ${CONTACT_EMAIL} from the email address on your account, or tell us the phone number you signed up with. We check that the account is yours, then delete it within 30 days and tell you when it's done.`,
    ],
  },
  {
    title: "When we have to wait",
    bullets: [
      "You have an order that isn't delivered or cancelled yet.",
      "You are waiting for a refund.",
      "Riders: you are in the middle of a delivery.",
      "Restaurant owners: your restaurant must be closed first, because it has its own customers, payouts and tax records. Email us and we'll close it with you.",
    ],
    paragraphs: ["As soon as these are finished, you can delete your account."],
  },
  {
    title: "What we delete",
    bullets: [
      "Your name, phone number, email address, password and profile photo.",
      "Your saved delivery addresses.",
      "The link to your Google, Apple or Facebook account.",
      "Your login sessions and your in-app notifications.",
      "Riders: your Ghana Card and other documents, your bike plate, and your location history.",
      "From your past orders: your phone number, landmarks, GhanaPost GPS code and notes. The drop-off point is blurred to about 1 km.",
    ],
  },
  {
    title: "What we keep, and why",
    bullets: [
      'Orders, payments and refunds, because tax and accounting law requires it. They no longer name you: they show "Deleted user".',
      'Your reviews, shown as "Deleted user", because restaurants\' ratings depend on them.',
      "Paystack keeps its own record of card and Mobile Money payments, under its own privacy policy.",
    ],
  },
  {
    title: "Google, Apple and Facebook",
    paragraphs: [
      "Deleting your CibusHub account removes our link to your Google, Apple or Facebook account. You can also remove CibusHub from your Google Account (Security, then Third-party apps), your Apple ID (Sign in with Apple) or Facebook (Settings, then Apps and websites). That does not delete your CibusHub account by itself, so delete it here too.",
    ],
  },
  {
    title: "Signing up again",
    paragraphs: [
      "Deleting can't be undone. You can sign up again later with the same phone number or email, but it will be a new, empty account.",
    ],
  },
];
