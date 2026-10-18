import HeroSection from "@/components/home/HeroSection";
import CravingSection from "@/components/home/CravingSection";
import OpenNowSection from "@/components/home/OpenNowSection";
import HowItWorks from "@/components/home/HowItWorks";
import WhyCibusHub from "@/components/home/WhyCibusHub";
import PayingSafe from "@/components/home/PayingSafe";
import JoinSection from "@/components/home/JoinSection";
import FaqSection from "@/components/home/FaqSection";
import HungryBanner from "@/components/home/HungryBanner";

// "/": the public home page for everyone, logged in or not. Every claim on it is something
// the app really does (no invented guarantees, fees or payout promises).
const HomePage = () => {
  return (
    <>
      <HeroSection />
      <CravingSection />
      <OpenNowSection />
      <HowItWorks />
      <WhyCibusHub />
      <PayingSafe />
      <JoinSection />
      <FaqSection />
      <HungryBanner />
    </>
  );
};

export default HomePage;
