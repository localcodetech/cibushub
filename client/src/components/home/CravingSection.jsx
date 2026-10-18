import { Link } from "react-router";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

// Each tile opens the restaurant list searched for that food (the search also looks at
// dishes, so "tilapia" finds every kitchen that grills it).
//   photo: a small copy in public/images/cravings, credited on /photo-credits
const CRAVINGS = [
  { label: "Jollof", search: "jollof", photo: "jollof" },
  { label: "Waakye", search: "waakye", photo: "waakye-special" },
  { label: "Fufu and soup", search: "fufu", photo: "fufu-light-soup" },
  { label: "Banku and tilapia", search: "tilapia", photo: "banku-tilapia-pepper" },
  { label: "Kenkey", search: "kenkey", photo: "ga-kenkey-shito" },
  { label: "Kelewele", search: "kelewele", photo: "kelewele" },
  { label: "Tuo zaafi", search: "tuo", photo: "tuo-zaafi-ayoyo" },
  { label: "Pizza", search: "pizza", photo: "pepperoni" },
  { label: "Burgers", search: "burger", photo: "beef-burger" },
  { label: "Shawarma", search: "shawarma", photo: "shawarma" },
];

// "What are you craving?": a row of food photos, one tap from the kitchens that cook it.
// Phones swipe through the row; wider screens show two rows of five.
const CravingSection = () => {
  return (
    <section className="pt-12">
      <Container>
        <Heading level={2}>What are you craving?</Heading>
        <Text muted className="mt-1">
          From chop bar fufu to late-night shawarma: tap a dish to see who cooks it.
        </Text>

        <ul className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
          {CRAVINGS.map((craving) => (
            <li key={craving.label} className="w-32 shrink-0 snap-start md:w-auto">
              <Link
                to={"/restaurants?q=" + encodeURIComponent(craving.search)}
                className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="block aspect-square overflow-hidden rounded-xl bg-muted">
                  <img
                    src={`/images/cravings/${craving.photo}.webp`}
                    alt=""
                    width="320"
                    height="320"
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                  />
                </span>
                <span className="mt-2 block text-center font-bold group-hover:text-primary">
                  {craving.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

export default CravingSection;
