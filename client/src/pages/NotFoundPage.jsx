import { Link } from "react-router";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

// Shown for any address that does not exist [AC-GLOBAL-05]
const NotFoundPage = () => {
  return (
    <Container>
      <section className="py-16 text-center">
        <Text className="font-heading text-6xl font-extrabold text-primary">404</Text>
        <Heading level={1} className="mt-4">
          We can't find that page
        </Heading>
        <Text muted className="mt-2">
          The link may be old, or the address has a typo.
        </Text>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          Go to the home page
        </Link>
      </section>
    </Container>
  );
};

export default NotFoundPage;
