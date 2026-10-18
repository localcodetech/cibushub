import { BadgeCheck, MapPin, PackageX, Receipt, Smartphone, Star } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { ListIcon } from "@/components/common/List";

// Every promise here is something the app really does (see docs/order-flow.md)
const REASONS = [
  {
    icon: BadgeCheck,
    title: "Every kitchen is checked",
    text: "Before a restaurant goes live, our team checks its business registration, FDA certificate and Ghana Card.",
  },
  {
    icon: Receipt,
    title: "The price you see is the price you pay",
    text: "Food, delivery fee and total are shown before you pay. No surprise charges at the door.",
  },
  {
    icon: PackageX,
    title: "Sold out means sold out",
    text: "Kitchens set how many portions they have each day. When a dish runs out, you see it straight away.",
  },
  {
    icon: MapPin,
    title: "Know when it arrives",
    text: "Follow your rider on the map with a live arrival time, from the kitchen counter to your gate.",
  },
  {
    icon: Star,
    title: "Reviews from real orders",
    text: "Only customers who received their food can rate it, so the stars you see are earned.",
  },
  {
    icon: Smartphone,
    title: "Light on your data",
    text: "Add CibusHub to your home screen like an app. Nothing to download from a store.",
  },
];

// Why order with CibusHub: six short promises, each with an icon
const WhyCibusHub = () => {
  return (
    <section className="py-12">
      <Container>
        <Heading level={2}>Why Kumasi orders with CibusHub</Heading>
        <Text muted className="mt-1 max-w-prose">
          Local food, local kitchens, and an order you can trust from the first tap to the last
          bite.
        </Text>
        <ul className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason) => (
            <li key={reason.title} className="flex gap-3">
              <ListIcon icon={reason.icon} />
              <div>
                <h3 className="font-heading text-lg font-bold">{reason.title}</h3>
                <p className="mt-1 text-[15px] text-muted-foreground">{reason.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

export default WhyCibusHub;
