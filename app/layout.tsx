import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "./_providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "My Journey to America",
  description: "The Ellis Island of the Digital Age — share and discover immigration stories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body
          className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen bg-cream text-navy`}
        >
          <Providers>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
