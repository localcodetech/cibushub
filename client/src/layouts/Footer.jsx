import { Link } from "react-router";
import Container from "./Container";
import Text from "@/components/typography/Text";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card text-sm text-muted-foreground">
      <Container>
        <div className="flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Text size="small" muted>
            © {year} CibusHub · Kumasi, Ghana
          </Text>

          <nav aria-label="Legal" className="flex gap-4">
            <Link to="/privacy" className="flex min-h-11 items-center font-bold hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="flex min-h-11 items-center font-bold hover:underline">
              Terms of Service
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
