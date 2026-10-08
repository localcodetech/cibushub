import { Link } from "react-router";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { useAuthStore } from "@/store/authStore";
import { homePathFor } from "@/utils/roleHome";

// Shown when a user opens a page their role is not allowed to see [AC-RBAC-07]
const ForbiddenPage = () => {
  const user = useAuthStore((state) => state.user);

  // A guest has no role, so their home is the public home page
  let homePath = "/";
  if (user) {
    homePath = homePathFor(user.role);
  }

  return (
    <Container>
      <section className="py-16 text-center">
        <Text className="font-heading text-6xl font-extrabold text-primary">403</Text>
        <Heading level={1} className="mt-4">
          You can't open this page
        </Heading>
        <Text muted className="mt-2">
          Your account does not have access to this area.
        </Text>
        <Link
          to={homePath}
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
        >
          Go to my home page
        </Link>
      </section>
    </Container>
  );
};

export default ForbiddenPage;
