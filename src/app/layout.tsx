import type { Metadata } from "next";
import "./globals.css";

export const viewport = { themeColor: "#12345B" };

export const metadata: Metadata = {
  title: "ScolaPay",
  description: "Recouvrement de la scolarité mensuelle pour établissements privés",
  manifest: "/manifest.json",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
