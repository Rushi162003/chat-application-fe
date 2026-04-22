import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/src/pages/globals.css";
import Snackbar from "@/src/components/Snackbar/Snackbar";
import AuthBootstrap from "@/src/components/AuthBootstrap/AuthBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col font-sans antialiased`}
      >
        <AuthBootstrap />
        {children}
        <div id="portals" />
        <Snackbar />
      </body>
    </html>
  );
}
