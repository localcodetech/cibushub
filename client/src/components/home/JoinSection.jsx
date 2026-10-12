import { Link } from "react-router";
import { Bike, Check, ChefHat } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Card from "@/components/common/Card";
import { ListIcon } from "@/components/common/List";

const JOIN = [
  {
    icon: ChefHat,
    title: "Cook with CibusHub",
    text: "Reach hungry customers across Kumasi without changing how your kitchen runs.",
    points: [
      "A simple order board with a sound for every new order",
      "Mark dishes sold out in one tap",
      "We check every restaurant before it goes live",
    ],
    action: "Register your restaurant",
  },
  {
    icon: Bike,
    title: "Ride with CibusHub",
    text: "Deliver food near you, on a motorbike, a car or a bicycle, when it suits you.",
    points: [
      "You keep the whole delivery fee of every order",
      "Offers come one at a time, with the distance shown",
      "You need a Ghana Card (and a driver's licence for a motorbike or car)",
    ],
    action: "Become a rider",
  },
];

// For restaurant owners and riders: what they get, and the way in
const JoinSection = () => {
  return (
    <section className="bg-card py-12">
      <Container>
        <div className="grid gap-4 md:grid-cols-2">
          {JOIN.map((item) => (
            <Card key={item.title} tone="quiet" padding="lg" className="flex flex-col">
              <ListIcon icon={item.icon} />
              <Heading level={2} className="mt-4">
                {item.title}
              </Heading>
              <p className="mt-1 text-muted-foreground">{item.text}</p>
              <ul className="mt-4 space-y-2 text-[15px]">
                {item.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <Check size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
              {/* Sign-up asks which kind of account: the same door for both */}
              <Link
                to="/register"
                className="mt-6 inline-flex min-h-12 items-center justify-center self-start rounded-md bg-primary px-5 font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {item.action}
              </Link>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default JoinSection;
