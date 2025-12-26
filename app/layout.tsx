import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Sidebar from "@/app/components/Layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WorkDashboard",
  description: "Track time, log work, manage team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-base-200 h-screen overflow-hidden text-base-content flex justify-center`}
      >
        <Providers>
          <div className="flex w-full max-w-[1280px] h-screen bg-base-100 shadow overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col p-8 overflow-hidden">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
