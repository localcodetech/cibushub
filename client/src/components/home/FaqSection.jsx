import { ChevronDown } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Card from "@/components/common/Card";
import { CONTACT_EMAIL } from "@/data/legal/legalInfo";

const QUESTIONS = [
  {
    question: "Which parts of Kumasi do you deliver to?",
    answer:
      "Each restaurant delivers within a set distance of its kitchen. If your address is too far, checkout tells you before you pay, so you can pick a closer kitchen.",
  },
  {
    question: "How is the delivery fee worked out?",
    answer:
      "A small base fee plus a little for each kilometre by road from the kitchen to your door. You see the exact fee before you pay.",
  },
  {
    question: "How do I pay with mobile money?",
    answer:
      "After you place your order, Paystack opens: choose Mobile Money and enter your number. Approve the prompt on your phone with your PIN, and your order goes straight to the kitchen.",
  },
  {
    question: "What if the kitchen can't make my order?",
    answer:
      "If the restaurant turns it down or doesn't answer within a few minutes, the order is cancelled and your money is refunded in full, automatically.",
  },
  {
    question: "How do I get help?",
    answer: "Open your order and call the restaurant, or email us at " + CONTACT_EMAIL + ".",
  },
];

// Short answers to what people ask first. <details> opens and closes without any script and
// works with the keyboard and screen readers out of the box.
const FaqSection = () => {
  return (
    <section className="py-12">
      <Container>
        <Heading level={2}>Questions</Heading>
        <div className="mt-6 max-w-3xl space-y-3">
          {QUESTIONS.map((item) => (
            <Card as="details" key={item.question} padding="none" className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  size={20}
                  className="shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="px-4 pb-4 text-muted-foreground">{item.answer}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default FaqSection;
