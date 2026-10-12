import { useState } from "react";
import { useNavigate } from "react-router";
import { Bike, KeyRound, Search, Smartphone } from "lucide-react";
import Container from "@/layouts/Container";

// The top of the home page: what CibusHub is, a search that opens the restaurant list, and
// what makes ordering easy. The gold code panel is the same one customers see at their door.
const HeroSection = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const words = search.trim();
    navigate(words ? "/restaurants?q=" + encodeURIComponent(words) : "/restaurants");
  };

  // Forest Green in light mode; in dark mode the brand green is a light mint, too bright for
  // a whole block, so the hero uses the dark card surface instead
  return (
    <section className="bg-primary text-primary-foreground dark:bg-card dark:text-foreground">
      <Container>
        <div className="grid items-center gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <h1 className="font-heading text-[32px] leading-tight font-bold md:text-[44px]">
              Hot waakye, jollof and chop bar favourites, delivered across Kumasi
            </h1>
            <p className="mt-4 max-w-xl text-lg opacity-90">
              Order from local kitchens in Adum, Bantama, Asokwa and beyond. Pay with mobile money
              or card and follow your rider to your gate.
            </p>

            <form onSubmit={handleSubmit} role="search" className="mt-6 flex max-w-xl gap-2">
              <label htmlFor="home-search" className="sr-only">
                Search for food or a restaurant
              </label>
              <div className="relative flex-1">
                <Search
                  size={20}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="home-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Waakye, jollof, fufu…"
                  className="h-12 w-full rounded-lg bg-white pr-3 pl-11 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none dark:bg-background"
                />
              </div>
              <button
                type="submit"
                className="h-12 shrink-0 rounded-md bg-gold px-5 font-bold text-gold-foreground focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                Find food
              </button>
            </form>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              <li className="flex items-center gap-2">
                <Smartphone size={18} aria-hidden="true" /> MoMo or card
              </li>
              <li className="flex items-center gap-2">
                <Bike size={18} aria-hidden="true" /> Live rider tracking
              </li>
              <li className="flex items-center gap-2">
                <KeyRound size={18} aria-hidden="true" /> A code only you know
              </li>
            </ul>
          </div>

          {/* What arrives at the door: the rider asks for this code before handing over */}
          <div className="mx-auto w-full max-w-sm rounded-2xl bg-background p-5 text-foreground">
            <p className="font-bold">Your order is on the way</p>
            <p className="text-[15px] text-muted-foreground">
              Rider Kojo · arriving in about 6 min
            </p>
            <div className="mt-4 rounded-lg bg-gold px-4 py-3 text-center text-gold-foreground">
              <p className="text-[13px] font-bold">Give your rider this code</p>
              <p className="font-heading text-4xl font-bold tracking-[0.3em]" aria-hidden="true">
                4821
              </p>
              <p className="sr-only">An example code: 4 8 2 1</p>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Your food is only handed over to you: no code, no handover.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HeroSection;
