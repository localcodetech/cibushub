import LegalPage from "@/components/common/LegalPage";
import { privacySections } from "@/data/legal/privacySections";

// Privacy Policy, linked from the footer and the sign-up form
const PrivacyPage = () => {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This explains what personal data CibusHub collects, why, who sees it, and the choices you have."
      sections={privacySections}
    />
  );
};

export default PrivacyPage;
