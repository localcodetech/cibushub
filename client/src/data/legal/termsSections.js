import { CONTACT_EMAIL } from "./legalInfo";

// The Terms of Service, one item per section. Written to match how the app really works
// (orders, payments, cancellations, refunds). Have a lawyer review it before launch.
export const termsSections = [
  {
    title: "Using CibusHub",
    paragraphs: [
      "By creating an account you agree to these Terms and to our Privacy Policy. CibusHub is a marketplace: restaurants prepare the food, riders deliver it, and CibusHub runs the app and takes the payment.",
    ],
  },
  {
    title: "Your account",
    bullets: [
      "Give true details, and keep your phone number up to date. We confirm it with an SMS code.",
      "Keep your password secret. You are responsible for orders placed from your account.",
      "Restaurant owners and riders can start only after we review and approve their details.",
      "We may suspend an account that breaks these Terms, for example for fraud or abuse.",
    ],
  },
  {
    title: "Orders and prices",
    bullets: [
      "Prices are in Ghana cedis (GHS) and include the item price, any options, the delivery fee and any service fee shown at checkout.",
      "The total you see at checkout is the total you pay.",
      "Delivery times are estimates. Traffic and weather can make them longer.",
      "Restaurants are responsible for the food, including its quality and allergy information. Ask the restaurant if you have an allergy.",
    ],
  },
  {
    title: "Payment",
    paragraphs: [
      "You pay through Paystack by Mobile Money or card. An order is confirmed only after the payment succeeds.",
    ],
  },
  {
    title: "Cancellations and refunds",
    bullets: [
      "You can cancel in the app until the restaurant accepts your order. If you already paid, you get a full refund.",
      "Once the restaurant has accepted your order, contact support to ask about cancelling.",
      "If a restaurant rejects your order, or we cancel it, you get a refund.",
      "Refunds go back to the Mobile Money wallet or card you paid with. We tell you when a refund starts and when it is done. Your bank or network may take a few days to show it.",
      "We never refund more than you paid.",
    ],
  },
  {
    title: "Things you must not do",
    bullets: [
      "Use someone else's account or payment method.",
      "Place fake orders, or abuse restaurants, riders or staff.",
      "Try to break, overload or copy the app.",
    ],
  },
  {
    title: "Our responsibility",
    paragraphs: [
      "We work hard to keep CibusHub running and accurate, but we cannot promise it will never be interrupted. Nothing in these Terms takes away rights you have under Ghanaian consumer law.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "If we change these Terms, we will update the date at the top and ask you to accept the new version.",
      `These Terms are governed by the laws of Ghana. Questions? Email ${CONTACT_EMAIL}.`,
    ],
  },
];
