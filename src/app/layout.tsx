import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommerceOS",
  description:
    "E-commerce operations dashboard for Urban Goods, a fictional US store.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  );
}
