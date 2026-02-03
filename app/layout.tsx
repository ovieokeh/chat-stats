import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const siteUrl = process.env.e;
const defaultTitle = "ChatWrapped — WhatsApp Chat Insights";
const defaultDescription =
  "Turn your WhatsApp chats into shareable insights. See reply speed, night‑owl energy, peak hours, and who starts the chaos. Private by design, processed on your device.";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: defaultTitle,
    template: "%s — ChatWrapped",
  },
  description: defaultDescription,
  applicationName: "ChatWrapped",
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    type: "website",
    url: siteUrl,
    images: [
      {
        url: "/og/og.svg",
        width: 1200,
        height: 630,
        alt: "ChatWrapped preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/og/og.svg"],
  },
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
