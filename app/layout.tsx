import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "./components/theme-provider";
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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="gibraltar-theme" strategy="beforeInteractive">
          {`
            try {
              var storedTheme = window.localStorage.getItem("gibraltar_theme");
              var theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
              document.documentElement.classList.toggle("dark", theme === "dark");
              document.documentElement.dataset.theme = theme;
            } catch (error) {
              document.documentElement.classList.add("dark");
              document.documentElement.dataset.theme = "dark";
            }
          `}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
