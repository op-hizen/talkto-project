import type { Metadata } from "next";
import "./globals.css";
import NextAuthSessionProvider from "@/components/session-provider";
import RealtimeBanListener from "@/components/realtime-ban-listener";

export const metadata: Metadata = {
  title: "TalkTo",
  description: "TalkTo - échanges humains, pas de superficialité.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <NextAuthSessionProvider>
          <RealtimeBanListener />
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
