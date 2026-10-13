import { Bell } from "lucide-react";
import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import { List, ListIcon, ListRow } from "@/components/common/List";
import ProfileNameCard from "@/components/profile/ProfileNameCard";
import ContactChangeCard from "@/components/profile/ContactChangeCard";
import ChangePasswordCard from "@/components/profile/ChangePasswordCard";

// /account: my profile, for every role [AC-CUST-01, AC-CUST-02, AC-AUTH-20].
// Photo and name, phone and email (each changed with a code sent to the new one), password.
const ProfilePage = () => {
  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader title="My profile" />
        <div className="mt-6 space-y-4">
          <ProfileNameCard />
          <ContactChangeCard kind="phone" />
          <ContactChangeCard kind="email" />
          <ChangePasswordCard />
          <List>
            <ListRow
              to="/notifications/settings"
              leading={<ListIcon icon={Bell} />}
              title="Notification settings"
              meta="Offers and news by email and SMS"
            />
          </List>
        </div>
      </section>
    </Container>
  );
};

export default ProfilePage;
