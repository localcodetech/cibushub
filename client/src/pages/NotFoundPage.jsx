import { Link, useNavigate } from "react-router";
import { ArrowLeft, SearchX } from "lucide-react";
import Container from "@/layouts/Container";
import StatusScreen from "@/components/common/StatusScreen";

const PRIMARY =
  "inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground";
const SECONDARY = "inline-flex min-h-11 items-center gap-1 px-2 font-bold text-primary";

// Shown for any address that does not exist [AC-GLOBAL-05]
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <StatusScreen
        icon={SearchX}
        code="404"
        title="We can't find that page"
        message="The link may be old, or the address has a typo. Let's get you back to the food."
      >
        <Link to="/restaurants" className={PRIMARY}>
          Browse restaurants
        </Link>
        <button type="button" onClick={() => navigate(-1)} className={SECONDARY}>
          <ArrowLeft size={18} aria-hidden="true" />
          Go back
        </button>
        <Link to="/" className={SECONDARY}>
          Home page
        </Link>
      </StatusScreen>
    </Container>
  );
};

export default NotFoundPage;
