import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import Tabs from "@/components/common/Tabs";
import Text from "@/components/typography/Text";
import { helpTopics } from "@/data/help/helpTopics";
import { CONTACT_EMAIL } from "@/data/legal/legalInfo";

// Help: short answers for customers, restaurants and riders, linked from the footer.
// One tab per kind of user; each question opens and closes on its own (<details>), so the
// page stays short and works without JavaScript tricks or extra libraries.
const HelpPage = () => {
  const [topic, setTopic] = useState(helpTopics[0].value);
  const chosen = helpTopics.find((item) => item.value === topic);

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-10">
        <PageHeader
          title="Help"
          subtitle="Quick answers about ordering, running a restaurant and riding with CibusHub."
        />

        <Tabs
          label="Help for"
          value={topic}
          onChange={setTopic}
          options={helpTopics.map((item) => ({ value: item.value, label: item.label }))}
          fill
          className="mt-6"
        />

        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {chosen.questions.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold text-foreground hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="space-y-2 px-4 pb-4">
                {item.answer.map((paragraph) => (
                  <Text key={paragraph} className="text-[15px]">
                    {paragraph}
                  </Text>
                ))}
              </div>
            </details>
          ))}
        </div>

        {/* Still stuck: one clear way to reach a person */}
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-primary/5 p-4">
          <Mail size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
          <Text className="text-[15px]">
            Didn't find your answer? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-primary">
              {CONTACT_EMAIL}
            </a>
            . If it's about an order, include its number (it starts with CH-).
          </Text>
        </div>
      </section>
    </Container>
  );
};

export default HelpPage;
