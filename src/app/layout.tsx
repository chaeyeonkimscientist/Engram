import type { Metadata } from "next";
import { Inter_Tight, Martian_Mono } from "next/font/google";
import "./globals.css";

/** Anything a person reads. Set very tight. */
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/** Anything the machine reports. Only ever small and tracked out. */
const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  title: "Engram — Identity & Design System",
  description:
    "A reading companion that models the reader's memory. Density is the belief.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} ${martianMono.variable}`}>{children}</body>
    </html>
  );
}
