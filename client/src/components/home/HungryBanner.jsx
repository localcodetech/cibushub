import Container from "@/layouts/Container";
import FoodSearchForm from "@/components/restaurant/FoodSearchForm";

// The last word on the home page: a green band with the food search, so nobody has to
// scroll back up to start an order
const HungryBanner = () => {
  return (
    <section className="pb-12">
      <Container>
        <div className="brand-surface rounded-2xl px-6 py-10 text-center text-primary-foreground md:px-12 dark:text-foreground">
          <h2 className="font-heading text-[28px] leading-tight font-bold md:text-[36px]">
            Hungry? Kumasi is cooking.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-lg opacity-90">
            Search for a dish or a restaurant and have it at your door.
          </p>
          <FoodSearchForm onDark className="mx-auto mt-6 text-left" />
        </div>
      </Container>
    </section>
  );
};

export default HungryBanner;
