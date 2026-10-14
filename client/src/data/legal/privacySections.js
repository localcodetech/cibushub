import { CONTACT_EMAIL } from "./legalInfo";

// The Privacy Policy, one item per section. Written to match what the app really does,
// and Ghana's Data Protection Act, 2012 (Act 843). Have a lawyer review it before launch.
export const privacySections = [
  {
    title: "Who we are",
    paragraphs: [
      "CibusHub connects customers in Kumasi with restaurants and delivery riders. We are responsible for the personal data described here.",
    ],
  },
  {
    title: "What we collect",
    bullets: [
      "Account details: your name, phone number, email address and password. We store only a scrambled (hashed) form of your password, never the password itself.",
      "If you continue with Google or Apple: your name, your email address (Apple may give us a private relay address instead) and an ID for your Google or Apple account. We never receive your Google or Apple password.",
      "Delivery addresses, including the map pin you place.",
      "Your orders: what you ordered, from where, when, and how much you paid.",
      "Payments: handled by Paystack. We never see or store your card number or Mobile Money PIN; we keep only the payment reference and status.",
      "Restaurant owners and riders: the business or identity documents (such as your Ghana Card) you upload so we can approve you. They are stored privately and only our review team can open them.",
      "Riders: your location while you are delivering an order.",
    ],
  },
  {
    title: "Why we use it",
    bullets: [
      "To create your account and check that your phone number is yours.",
      "To take, prepare, deliver and refund orders.",
      "To send you codes, order updates and receipts.",
      "To keep CibusHub safe: stopping fraud and misuse.",
      "To meet tax and accounting rules.",
    ],
  },
  {
    title: "Who sees it",
    bullets: [
      "Restaurants see what you ordered and any notes you added. They do not see your phone number or full address.",
      "Riders see the delivery address, and your phone number only while they are delivering your order.",
      "Service providers who help us run CibusHub: Paystack (payments), Nalo Solutions (SMS), our email provider, Cloudinary (images and documents), Google Maps (maps and distances), and Google and Apple when you choose to sign in with them. They may use your data only to provide their service to us.",
      "Authorities, when the law requires it.",
    ],
    paragraphs: ["We never sell your personal data."],
  },
  {
    title: "How long we keep it",
    bullets: [
      "Your account details, for as long as your account is open.",
      "Rider location history, for 30 days.",
      "Order and payment records, for as long as tax and accounting law requires. If you delete your account, we remove your name and contact details from them.",
    ],
  },
  {
    title: "Cookies and storage on your device",
    paragraphs: [
      "We use two cookies to keep you logged in. They cannot be read by other websites or by scripts on the page. We also save your light or dark theme choice on your device. We do not use advertising or tracking cookies.",
    ],
  },
  {
    title: "How we protect it",
    paragraphs: [
      "Connections to CibusHub are encrypted, passwords are hashed, sensitive documents are private, and staff can see only what their job needs.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: [
      `Under the Data Protection Act, 2012 (Act 843) you can ask to see the personal data we hold about you, correct it, or delete your account. You can change your details and delete your account yourself under My profile, or email ${CONTACT_EMAIL}. The Delete your data page explains how, and what is kept. If you are unhappy with our answer, you can complain to the Data Protection Commission of Ghana.`,
    ],
  },
  {
    title: "Changes",
    paragraphs: [
      "If we change this policy, we will update the date at the top and tell you in the app before the change affects you.",
    ],
  },
];
