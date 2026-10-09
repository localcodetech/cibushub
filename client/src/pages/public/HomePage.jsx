import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";

const HomePage = () => {
  return (
    <Container>
      <section className="py-10">
        <Heading level={1}>Food from Kumasi kitchens, brought to your door</Heading>
        <Text muted className="mt-2">
          Browse restaurants near you. Coming soon.
        </Text>

        <Card className="mt-6">
          <Heading level={3}>How it works</Heading>
          <Text size="small" muted className="mt-1">
            Choose your food, pay with mobile money or card, and track your rider.
          </Text>
        </Card>
      </section>
    </Container>
  );
};

export default HomePage;
