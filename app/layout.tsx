import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, League_Spartan } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmSerif = IBM_Plex_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const leagueSpartan = League_Spartan({
  variable: "--font-spartan",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nigerian Names | Discover Meaning & Pronunciation",
  description: "The ultimate guide to pronouncing Nigerian names correctly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${ibmSans.variable} ${ibmSerif.variable} ${leagueSpartan.variable} antialiased bg-[#F7F5F3]`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
