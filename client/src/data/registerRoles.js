import { Bike, ShoppingBag, Store } from "lucide-react";

// The three kinds of account a guest can create [AC-AUTH-01, AC-AUTH-05].
// The sign-up page shows one flip card per item: icon and title on the front; what the role
// gets on the back, shown once it's chosen.
export const registerRoles = [
  {
    value: "CUSTOMER",
    title: "Customer",
    icon: ShoppingBag,
    description: "Order food from kitchens near you.",
    perks: ["Hot meals from across Kumasi", "Pay with MoMo or card", "Follow your rider live"],
  },
  {
    value: "RESTAURANT_OWNER",
    title: "Restaurant owner",
    icon: Store,
    description: "Sell your food on CibusHub. We check your details first.",
    perks: [
      "Your menu online in minutes",
      "Orders straight to your kitchen",
      "Weekly sales reports",
    ],
  },
  {
    value: "RIDER",
    title: "Rider",
    icon: Bike,
    description: "Deliver orders and earn. We check your details first.",
    perks: ["Choose when you ride", "Deliveries near you", "See your earnings every day"],
  },
];
