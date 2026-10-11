import { Hourglass } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { formatTime } from "@/utils/date";

const PROBLEM_WORDS = {
  UNREACHABLE: "Customer unreachable",
  NOT_AT_ADDRESS: "Customer not at the address",
  REFUSED_CODE: "Customer won't give the code",
};

// After a door problem: "Wait here until 14:32 (7:41 left)" [AC-DEL-08].
// problem: { type, waitEndsAt } from the server
const DoorWaitBanner = ({ problem }) => {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((new Date(problem.waitEndsAt).getTime() - now) / 1000));
  const timeLeft = Math.floor(secondsLeft / 60) + ":" + String(secondsLeft % 60).padStart(2, "0");

  return (
    <div
      role="status"
      className="flex gap-3 rounded-lg border border-amber-500 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
    >
      <Hourglass size={24} className="shrink-0" aria-hidden="true" />
      <div className="text-[15px]">
        <p className="font-bold">{PROBLEM_WORDS[problem.type]}: reported</p>
        {secondsLeft > 0 ? (
          <p>
            Wait here until <strong>{formatTime(problem.waitEndsAt)}</strong> ({timeLeft} left). If
            the customer comes, enter their code as usual.
          </p>
        ) : (
          <p>Time's up. You'll be asked to take the food back in a moment.</p>
        )}
      </div>
    </div>
  );
};

export default DoorWaitBanner;
