import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { useAuthStore } from "@/store/authStore";

const OwnerDashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Container>
      <section className="py-10">
        <Heading level={1}>Restaurant dashboard</Heading>
        <Text muted className="mt-2">
          Welcome, {user?.fullName}. Your orders and menu will show here.
        </Text>
      </section>
    </Container>
  );
};

export default OwnerDashboardPage;
