import "./globals.css";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
});

export const metadata = {
  title: "Trackr",
  description: "Keep track of all your applications",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${dmSans.className} min-h-screen`}>{children}</body>
    </html>
  );
}