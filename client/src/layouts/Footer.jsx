import Container from "./Container";
import Text from "@/components/typography/Text";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card text-sm text-muted-foreground">
      <Container>
        <Text size="small" muted className="py-6">
          © {year} CibusHub · Kumasi, Ghana
        </Text>
      </Container>
    </footer>
  );
};

export default Footer;
