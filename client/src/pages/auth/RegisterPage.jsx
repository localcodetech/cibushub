import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

const RegisterPage = () => {
  return (
    <Container>
      <section className="py-10">
        <Heading level={1}>Create an account</Heading>
        <Text muted className="mt-2">
          The sign-up form comes in a later task.
        </Text>
      </section>
    </Container>
  );
};

export default RegisterPage;
