
// app/auth/error/page.tsx
export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams?.reason;
  const message =
    reason === "no_email"
      ? "Your provider did not return an email address. Please use an account that shares an email."
      : "We couldn’t sign you in. Please try again.";

  return (
    <main style={{ padding: 24 }}>
      <h1>Sign-in error</h1>
      <p>{message}</p>
      <a href="/api/auth/signin">Back to sign in</a>
    </main>
  );
}
