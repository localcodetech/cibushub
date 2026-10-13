import { Link, useNavigate } from "react-router";
import { ArrowLeft, Lock } from "lucide-react";
import Container from "@/layouts/Container";
import StatusScreen from "@/components/common/StatusScreen";
import { useAuthStore } from "@/store/authStore";
import { homePathFor } from "@/utils/roleHome";

const PRIMARY =
  "inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground";
const SECONDARY = "inline-flex min-h-11 items-center gap-1 px-2 font-bold text-primary";

// Shown when a user opens a page their role is not allowed to see [AC-RBAC-07]
const ForbiddenPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // A guest has no role, so their home is the public home page
  const homePath = user ? homePathFor(user.role) : "/";

  return (
    <Container>
      <StatusScreen
        icon={Lock}
        code="403"
        title="You can't open this page"
        message="Your account doesn't have access to this area. If you think it should, contact CibusHub support."
      >
        <Link to={homePath} className={PRIMARY}>
          Go to my home page
        </Link>
        <button type="button" onClick={() => navigate(-1)} className={SECONDARY}>
          <ArrowLeft size={18} aria-hidden="true" />
          Go back
        </button>
      </StatusScreen>
    </Container>
  );
};

export default ForbiddenPage;
