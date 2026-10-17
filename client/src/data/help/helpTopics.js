import { CONTACT_EMAIL } from "@/data/legal/legalInfo";

// The Help page: short answers, one tab per kind of user. Written to match what the app
// really does (docs/order-flow.md is the developer version). Update both together.
//   value:     the tab
//   questions: [{ question, answer }], answer is one or more paragraphs
export const helpTopics = [
  {
    value: "customers",
    label: "Customers",
    questions: [
      {
        question: "How do I order?",
        answer: [
          "Pick a restaurant, add dishes to your cart, then tap Checkout. Choose or add your delivery address, check the total, and tap Place order. You then pay with Mobile Money or a card on Paystack's secure page.",
        ],
      },
      {
        question: "How is the delivery fee worked out?",
        answer: [
          "A small base fee plus a fee for each kilometre from the restaurant to your address. You always see the full total, with the delivery fee, before you pay, and that is exactly what you're charged.",
        ],
      },
      {
        question: "I paid, but the page still says it's confirming",
        answer: [
          "We wait for Paystack to confirm the payment before telling the restaurant. This usually takes a few seconds. If the payment didn't go through, you can try again from your order. You're never charged twice for the same order.",
        ],
      },
      {
        question: "What if I don't pay?",
        answer: ["An unpaid order is cancelled after 30 minutes, and nothing is charged."],
      },
      {
        question: "Can I cancel my order?",
        answer: [
          "Yes, until the restaurant accepts it. You get a full refund. Once the kitchen has started, the order can no longer be cancelled from the app; contact us if something is wrong.",
        ],
      },
      {
        question: "What if the restaurant doesn't answer?",
        answer: [
          "Restaurants have 5 minutes to accept a paid order. If they don't, or they turn it down, the order is cancelled and you get a full refund automatically.",
        ],
      },
      {
        question: "How long do refunds take?",
        answer: [
          "We send refunds to Paystack straight away, and you get a message when it's sent. How soon you see the money depends on your bank or mobile network: usually a few working days.",
        ],
      },
      {
        question: "What is the 4-digit delivery code?",
        answer: [
          "When the rider has your food, your order page shows a 4-digit code. Give it to the rider only when you have your food in hand. It proves the food reached the right person.",
          'If the code gets locked after wrong tries, your order page lets you confirm "I\'ve received my food" yourself.',
        ],
      },
      {
        question: "What if I'm not there when the rider arrives?",
        answer: [
          "The rider will call you. If they can't reach you, they report it and wait 10 minutes; you'll see the countdown on your order page. If nobody comes, the food goes back to the restaurant and the order is not refunded, so please keep your phone close.",
        ],
      },
      {
        question: "Can I track my rider?",
        answer: [
          "Yes. Once a rider picks up your food, your order page shows them moving on the map, with an estimated arrival time.",
        ],
      },
      {
        question: "Where's my receipt?",
        answer: [
          "Open the order under My orders and tap Receipt. You can also download it as a PDF.",
        ],
      },
      {
        question: "Can I review a restaurant?",
        answer: [
          "Yes, within 7 days of delivery: rate the food and the rider from 1 to 5 stars, and add a comment if you like. Restaurants can reply.",
        ],
      },
    ],
  },
  {
    value: "restaurants",
    label: "Owners",
    questions: [
      {
        question: "How do I add my restaurant?",
        answer: [
          "Sign up as a Restaurant owner and verify your phone. Then go to My restaurants, tap New restaurant, and fill in its name, address pin and opening hours.",
          "Upload your documents (business registration, FDA certificate and Ghana Card) and a few photos. Our team checks them, and you get an SMS and email when you're approved.",
        ],
      },
      {
        question: "How do I build my menu?",
        answer: [
          "Open your restaurant and go to Menu. Add categories (e.g. Soups, Rice, Drinks), then dishes with a price, a photo and options such as size or extra meat. You can set a daily stock, e.g. 20 portions, and the app stops selling at zero.",
        ],
      },
      {
        question: "How do I receive orders?",
        answer: [
          "Keep the Orders page open: new paid orders appear with a sound. Tap Accept and choose a preparation time, or Reject with a reason. Then mark the order Preparing, and Ready for pickup when it's packed.",
          "You have 5 minutes to answer a new order. After that it's cancelled and the customer is refunded.",
        ],
      },
      {
        question: "Can I stop taking orders for a while?",
        answer: [
          "Yes. In your restaurant's settings, turn off Taking orders when the kitchen is too busy, and turn it back on when you're ready. Customers can still see your menu, but they can't order.",
        ],
      },
      {
        question: "When does a rider come?",
        answer: [
          "We start looking for a rider as soon as you accept, so they can travel while you cook. The rider taps Picked up at your counter.",
        ],
      },
      {
        question: "How do I get paid?",
        answer: [
          "Customers pay CibusHub through Paystack. For each delivered order you earn the food price minus CibusHub's commission; delivery fees go to the rider. You can see your sales under Analytics and History. For payout dates and details, contact us.",
        ],
      },
    ],
  },
  {
    value: "riders",
    label: "Riders",
    questions: [
      {
        question: "How do I become a rider?",
        answer: [
          "Sign up as a Rider and verify your phone. Fill in your application with your vehicle, plate number and Ghana Card number, and upload your Ghana Card and licence. You get an SMS and email once we've approved you.",
        ],
      },
      {
        question: "How do I get deliveries?",
        answer: [
          "Tap Go online and keep the app open. When an order near you is ready to go, you get an offer with a sound. You have 60 seconds to accept or decline. Declining is fine: the order goes to the next rider.",
        ],
      },
      {
        question: "Why did the app take me offline?",
        answer: [
          "If your phone stops sending its location for 5 minutes (app closed, no data, phone off), you're taken offline so you aren't sent orders you can't see. Just go online again.",
        ],
      },
      {
        question: "How do I complete a delivery?",
        answer: [
          "At the restaurant, tap Picked up. At the customer, ask for their 4-digit code and type it in. That completes the delivery.",
        ],
      },
      {
        question: "What if the customer isn't there?",
        answer: [
          "Call them from the app at least twice, then report the problem. A 10-minute wait starts. If they still don't come, take the food back to the restaurant and tap Returned. You're paid 1.5 times for that delivery.",
        ],
      },
      {
        question: "How much do I earn?",
        answer: [
          "You earn the delivery fee of each order you deliver. See every delivery and your totals under Earnings.",
        ],
      },
    ],
  },
  {
    value: "account",
    label: "Account",
    questions: [
      {
        question: "I didn't get my SMS code",
        answer: [
          "Wait a minute and tap Resend. Check the number is right, and that your phone has signal. If it still doesn't come, contact us.",
        ],
      },
      {
        question: "I forgot my password",
        answer: [
          "On the Log in page, tap Forgot password and enter your phone number or email. We send you a code to set a new password.",
        ],
      },
      {
        question: "How do I change my phone, email or photo?",
        answer: [
          "Open My profile. Changing your phone or email sends a code to the new one to confirm it's yours.",
        ],
      },
      {
        question: "Can I sign in with Google or Apple?",
        answer: [
          "Yes. On Sign up, choose how you'll use CibusHub, tick the Terms box, then continue with Google or Apple. You'll then add and verify your phone number.",
        ],
      },
      {
        question: "How do I delete my account?",
        answer: [
          "Open My profile and scroll to Delete my account. The Delete your data page explains exactly what is removed and what we have to keep.",
        ],
      },
      {
        question: "How do I contact you?",
        answer: [
          `Email ${CONTACT_EMAIL}. Include your order number if it's about an order (it starts with CH-).`,
        ],
      },
    ],
  },
];
