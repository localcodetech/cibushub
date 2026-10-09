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
          Restaurants near you will show here (Step 7).
        </Text>
      </section>
    </Container>
  );
};

export default CustomerHomePage;
