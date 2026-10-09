import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { COMPANY_ADDRESS, COMPANY_NAME, LEGAL_LAST_UPDATED } from "@/data/legal/legalInfo";

// The layout shared by the Privacy Policy and the Terms.
// sections: a list of { title, paragraphs?, bullets? } from data/legal/
const LegalPage = ({ title, intro, sections }) => {
  return (
    <Container>
      <article className="mx-auto max-w-2xl py-10">
        <Heading level={1}>{title}</Heading>
        <Text size="small" muted className="mt-2">
          Last updated {LEGAL_LAST_UPDATED}
        </Text>
        <Text className="mt-6">{intro}</Text>

        {sections.map((section) => (
          <section key={section.title} className="mt-8">
            <Heading level={2}>{section.title}</Heading>

            {/* Some sections have a list, some have paragraphs, some have both */}
            {section.bullets && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-foreground">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}

            {section.paragraphs &&
              section.paragraphs.map((paragraph) => (
                <Text key={paragraph} className="mt-3">
                  {paragraph}
                </Text>
              ))}
          </section>
        ))}

        <Text size="small" muted className="mt-10">
          {COMPANY_NAME} · {COMPANY_ADDRESS}
        </Text>
      </article>
    </Container>
  );
};

export default LegalPage;
