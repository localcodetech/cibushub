import { Link } from "react-router";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { useAuthStore } from "@/store/authStore";

const CustomerHomePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Container>
      <section className="py-10">
        <Heading level={1}>Hello, {user?.fullName}</Heading>
        <Text muted className="mt-2">
          What would you like to eat today?
        </Text>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/restaurants"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
          >
            Browse restaurants
          </Link>
          <Link
            to="/customer/orders"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-5 font-bold"
          >
            My orders
          </Link>
          <Link
            to="/customer/addresses"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-5 font-bold"
          >
            My addresses
          </Link>
        </div>
      </section>
    </Container>
  );
};

export default CustomerHomePage;
