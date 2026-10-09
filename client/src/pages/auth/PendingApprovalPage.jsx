import { Navigate, useNavigate } from "react-router";
import { Clock } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { homePathFor } from "@/utils/roleHome";

// Shown to restaurant owners and riders until an admin approves them [AC-AUTH-05]
const PendingApprovalPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Not logged in: log in first
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Phone not verified yet: that comes first
  if (!user.phoneVerifiedAt) {
    return <Navigate to="/verify-phone" replace />;
  }

  // Not waiting for approval (already approved, or a customer): go home
  if (user.status !== "PENDING_APPROVAL") {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <Container>
      <section className="mx-auto max-w-md py-16 text-center">
        <Clock size={48} className="mx-auto text-primary" aria-hidden="true" />
        <Heading level={1} className="mt-4">
          Account submitted for review
        </Heading>
        <Text muted className="mt-2">
          Thanks, {user.fullName}. Our team checks every restaurant owner and rider before they can
          start.
        </Text>

        <div className="mt-8 rounded-lg border border-border p-4 text-left">
          <Text className="font-bold">What happens next</Text>
          <ol className="mt-2 list-decimal pl-5 text-[15px] text-muted-foreground">
            <li>We review your details, usually within 1 to 2 working days.</li>
            <li>We text you at {user.phone} when you're approved.</li>
            <li>Log in again and your dashboard will be ready.</li>
          </ol>
        </div>

        <Button
          type="button"
          onClick={handleLogout}
          className="mt-8 h-12 w-full text-base font-bold"
        >
          Log out
        </Button>
      </section>
    </Container>
  );
};

export default PendingApprovalPage;
