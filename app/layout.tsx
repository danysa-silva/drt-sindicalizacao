import type { Metadata } from "next";
import { Geist } from "next/font/google";
import NavBar from "./components/NavBar";
import { UserProvider } from "./components/UserContext";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "DRT - Empresas Sindicalizadas",
  description: "Sistema de cadastro de empresas sindicalizadas - Sistema Patronal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="min-h-screen bg-gray-50 antialiased">
        <UserProvider>
          <NavBar />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
