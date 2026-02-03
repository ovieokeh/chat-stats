import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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
      <body className="antialiased bg-base-200 h-screen overflow-hidden text-base-content">
        <Providers>
          <div className="w-full h-full bg-base-100 flex flex-col">
            <main className="flex-1 relative h-full w-full overflow-hidden">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
