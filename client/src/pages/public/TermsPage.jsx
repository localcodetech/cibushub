import LegalPage from "@/components/common/LegalPage";
import { termsSections } from "@/data/legal/termsSections";

// Terms of Service, linked from the footer and the sign-up form
const TermsPage = () => {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These are the rules for using CibusHub to order, sell or deliver food. Please read them before you sign up."
      sections={termsSections}
    />
  );
};

export default TermsPage;
