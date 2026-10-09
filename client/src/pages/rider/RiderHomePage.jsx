import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { useAuthStore } from "@/store/authStore";

const RiderHomePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Container>
      <section className="py-10">
        <Heading level={1}>Rider home</Heading>
        <Text muted className="mt-2">
          Welcome, {user?.fullName}. Delivery offers will show here.
        </Text>
      </section>
    </Container>
  );
};

export default RiderHomePage;
