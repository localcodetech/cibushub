import { Link } from "react-router";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

// Each tile opens the restaurant list searched for that food (the search also looks at
// dishes, so "tilapia" finds every kitchen that grills it). One word per search: the search
// matches any of the words, so "egg sandwich" would also find every egg dish.
//   photo: a small copy in public/images/cravings, credited on /photo-credits
const tile = (label, search, photo) => ({ label, search, photo });

// The tiles change with the time in Kumasi: breakfast, the rest of the day, late night
const MEALS = {
  morning: {
    title: "Good morning, Kumasi. Breakfast?",
    text: "Koko, waakye and tea bread from the kitchens that open early.",
    cravings: [
      tile("Hausa koko", "koko", "hausa-koko"),
      tile("Waakye", "waakye", "waakye-special"),
      tile("Tea and bread", "bread", "tea-and-bread"),
      tile("Kosai", "kosai", "kosai"),
      tile("Porridge", "porridge", "oats-porridge"),
      tile("Pancakes", "pancakes", "pancakes"),
      tile("Bofrot", "bofrot", "bofrot"),
      tile("Egg sandwich", "sandwich", "egg-sandwich"),
      tile("Gari foto", "gari", "gari-foto"),
      tile("Tubaani", "tubaani", "tubaani"),
    ],
  },
  day: {
    title: "What are you craving?",
    text: "From chop bar fufu to late-night shawarma: tap a dish to see who cooks it.",
    cravings: [
      tile("Jollof", "jollof", "jollof"),
      tile("Waakye", "waakye", "waakye-special"),
      tile("Fufu and soup", "fufu", "fufu-light-soup"),
      tile("Banku and tilapia", "tilapia", "banku-tilapia-pepper"),
      tile("Kenkey", "kenkey", "ga-kenkey-shito"),
      tile("Kelewele", "kelewele", "kelewele"),
      tile("Tuo zaafi", "tuo", "tuo-zaafi-ayoyo"),
      tile("Pizza", "pizza", "pepperoni"),
      tile("Burgers", "burger", "beef-burger"),
      tile("Shawarma", "shawarma", "shawarma"),
    ],
  },
  night: {
    title: "Evening cravings",
    text: "Kelewele, kebabs and grills, hot from the kitchens still cooking tonight.",
    cravings: [
      tile("Kelewele", "kelewele", "kelewele"),
      tile("Kebabs", "kebab", "chicken-kebab"),
      tile("Shawarma", "shawarma", "shawarma"),
      tile("Grilled chicken", "grilled", "grilled-chicken-fries"),
      tile("Banku and tilapia", "tilapia", "banku-tilapia-pepper"),
      tile("Fried yam", "yam", "fried-yam-pepper"),
      tile("Wings", "wings", "spicy-chicken-wings"),
      tile("Pizza", "pizza", "pepperoni"),
      tile("Burgers", "burger", "beef-burger"),
      tile("Jollof", "jollof", "jollof"),
    ],
  },
};

// The hour in Kumasi (0-23), whatever time zone the phone is set to
const kumasiHour = () =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Africa/Accra",
    }).format(new Date()),
  );

// 05:00-10:59 breakfast, 11:00-16:59 the day's favourites, 17:00-04:59 evening
const mealNow = () => {
  const hour = kumasiHour();
  if (hour >= 5 && hour < 11) return MEALS.morning;
  if (hour >= 11 && hour < 17) return MEALS.day;
  return MEALS.night;
};

// A row of food photos, one tap from the kitchens that cook it.
// Phones swipe through the row; wider screens show two rows of five.
const CravingSection = () => {
  const meal = mealNow();

  return (
    <section className="pt-12">
      <Container>
        <Heading level={2}>{meal.title}</Heading>
        <Text muted className="mt-1">
          {meal.text}
        </Text>

        <ul className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
          {meal.cravings.map((craving) => (
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
