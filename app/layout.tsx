import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gibraltar",
  description:
    "Clear customer replies and steady follow-through for busy local businesses.",
  icons: {
    icon: [
      { url: "/brand/gibraltar-mark.svg", type: "image/svg+xml" },
      { url: "/brand/gibraltar-mark.png", type: "image/png" },
    ],
    apple: [{ url: "/brand/gibraltar-mark.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
