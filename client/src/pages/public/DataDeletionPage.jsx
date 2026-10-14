import LegalPage from "@/components/common/LegalPage";
import { dataDeletionSections } from "@/data/legal/dataDeletionSections";

// How to delete your account and data, linked from the footer and the Privacy Policy.
// Google and Apple's consoles ask for this page's address.
const DataDeletionPage = () => {
  return (
    <LegalPage
      title="Delete your data"
      intro="You can delete your CibusHub account and personal data at any time. This page explains how, and what happens to your data."
      sections={dataDeletionSections}
    />
  );
};

export default DataDeletionPage;
