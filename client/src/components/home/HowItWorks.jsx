import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Card from "@/components/common/Card";

const STEPS = [
  {
    title: "Choose your food",
    text: "Pick a kitchen near you and build your order. Sold-out dishes are marked, so what you choose is what you get.",
  },
  {
    title: "Pay with MoMo or card",
    text: "Pay safely through Paystack. The restaurant only starts cooking once your payment is confirmed.",
  },
  {
    title: "Follow your rider",
    text: "Watch your rider on the map. At your gate, give them your 4-digit code to receive your food.",
  },
];

// Three steps from choosing to eating
const HowItWorks = () => {
  return (
    <section className="bg-card py-12">
      <Container>
        <Heading level={2}>How it works</Heading>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card as="li" key={step.title} tone="quiet" padding="lg">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-md bg-primary font-heading text-lg font-bold text-primary-foreground"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 font-heading text-lg font-bold">{step.title}</h3>
              <p className="mt-1 text-[15px] text-muted-foreground">{step.text}</p>
            </Card>
          ))}
        </ol>
      </Container>
    </section>
  );
};

export default HowItWorks;
