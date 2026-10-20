import LegalPage from "@/components/common/LegalPage";
import { cookieSections } from "@/data/legal/cookieSections";

// Which cookies CibusHub uses and why, linked from the footer, the cookie notice and the
// Privacy Policy
const CookiesPage = () => {
  return (
    <LegalPage
      title="Cookies"
      intro="CibusHub only uses the cookies it needs to keep you logged in. This page explains what they are and what else we save on your device."
      sections={cookieSections}
    />
  );
};

export default CookiesPage;
