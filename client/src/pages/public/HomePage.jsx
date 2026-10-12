import HeroSection from "@/components/home/HeroSection";
import OpenNowSection from "@/components/home/OpenNowSection";
import HowItWorks from "@/components/home/HowItWorks";
import PayingSafe from "@/components/home/PayingSafe";
import JoinSection from "@/components/home/JoinSection";
import FaqSection from "@/components/home/FaqSection";

// "/": the public home page for everyone, logged in or not. Every claim on it is something
// the app really does (no invented guarantees, fees or payout promises).
const HomePage = () => {
  return (
    <>
      <HeroSection />
      <OpenNowSection />
      <HowItWorks />
      <PayingSafe />
      <JoinSection />
      <FaqSection />
    </>
  );
};

export default HomePage;
