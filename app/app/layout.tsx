// /app/app/layout.tsx
import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Domine } from "next/font/google";

const domine = Domine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${domine.className} min-h-screen bg-blend-normal bg-gray-200 text-gray-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
