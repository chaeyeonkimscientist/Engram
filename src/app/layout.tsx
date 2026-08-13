import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

/** UI sans — chrome, labels, cards. */
const ui = Geist({
  variable: "--font-ui",
  subsets: ["latin"],
});

/** Micro-labels and every numeric on screen. Monospace ⇒ tabular by construction. */
const micro = Geist_Mono({
  variable: "--font-micro",
  subsets: ["latin"],
});

/** The reading face. Only the reading column uses this. */
const reading = Newsreader({
  variable: "--font-reading",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Engram — design system",
  description:
    "Reading companion that models the reader's memory. An instrument, not a chatbot.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${ui.variable} ${micro.variable} ${reading.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
