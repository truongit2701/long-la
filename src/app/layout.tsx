import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Long La Auth",
  description: "Next.js, MongoDB, shadcn/ui, JWT cookie auth starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
