import { Link } from "react-router";
import Container from "./Container";
import Text from "@/components/typography/Text";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-card text-sm text-muted-foreground print:hidden">
      {/* The kente band above the footer */}
      <div aria-hidden="true" className="kente-band h-1.5" />
      <Container>
        <div className="flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Text size="small" muted>
            © {year} CibusHub · Kumasi, Ghana
          </Text>

          <nav aria-label="Legal" className="flex flex-wrap gap-x-4">
            <Link to="/help" className="flex min-h-11 items-center font-bold hover:underline">
              Help
            </Link>
            <Link to="/privacy" className="flex min-h-11 items-center font-bold hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="flex min-h-11 items-center font-bold hover:underline">
              Terms of Service
            </Link>
            <Link
              to="/data-deletion"
              className="flex min-h-11 items-center font-bold hover:underline"
            >
              Delete your data
            </Link>
            {/* The food photos (the home page's, and the demo's dishes) are credited here */}
            <Link
              to="/photo-credits"
              className="flex min-h-11 items-center font-bold hover:underline"
            >
              Photo credits
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
