
// /app/app/calendar/SignInGate.tsx
import { getSession } from "../../app/auth";
import SignInBanner from "../../app/components/SignInBanner";

/**
 * Shows a sign-in banner if the user is not authenticated.
 * Use at the top of calendar content (above controls) so the rest of the page remains public.
 */
export default async function CalendarSignInGate() {
  const session = await getSession();
  if (session?.user?.id) return null;

  return (
    <div className="mb-4">
      <SignInBanner
        title="Optional sign-in"
        message="Sign in with Google to add/delete your own comments and personalize views."
        redirectTo="/calendar"
      />
    </div>
  );
}
