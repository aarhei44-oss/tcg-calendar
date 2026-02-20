
// /app/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* keep body minimal to avoid missing CSS path issues */}
      <body>{children}</body>
    </html>
  );
}
