import { Bike, ShoppingBag, Store } from "lucide-react";

const POINTS = [
  {
    icon: ShoppingBag,
    title: "Hungry?",
    text: "Order from kitchens across Kumasi and follow your rider to your door.",
  },
  {
    icon: Store,
    title: "Run a kitchen?",
    text: "Put your menu online and take orders straight to your kitchen.",
  },
  {
    icon: Bike,
    title: "Got a bike?",
    text: "Deliver when it suits you and see what you earn every day.",
  },
];

// The left half of the Log in and Sign up pages on laptops and desktops (like Facebook's):
// what CibusHub is, beside the form. Hidden on phones, where the form comes first.
const AuthWelcome = () => {
  return (
    <div className="hidden lg:block lg:pt-6">
      <p className="font-heading text-4xl font-extrabold text-primary">CibusHub</p>
      <p className="mt-4 max-w-md font-heading text-3xl leading-tight font-bold text-foreground">
        Hot food from Kumasi&rsquo;s kitchens, delivered to your door.
      </p>
      <span aria-hidden="true" className="mt-4 block h-1 w-16 rounded-full bg-gold" />

      <ul className="mt-8 flex max-w-md flex-col gap-6">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon size={24} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-heading font-bold text-foreground">{title}</span>
              <span className="block text-[15px] text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AuthWelcome;
