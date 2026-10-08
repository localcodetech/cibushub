import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

const LoginPage = () => {
  return (
    <Container>
      <section className="py-10">
        <Heading level={1}>Log in</Heading>
        <Text muted className="mt-2">
          The login form comes in the next task.
        </Text>
      </section>
    </Container>
  );
};

export default LoginPage;
