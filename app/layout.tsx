import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lyve - Dot Grid Shader",
  description: "Animated halftone dot grid shader with bloom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
