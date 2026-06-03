import type { Metadata } from "next";
import NavBar from "./components/NavBar";
import { UserProvider } from "./components/UserContext";
import AuthGuard from "./components/AuthGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRT - Empresas Sindicalizadas",
  description: "Sistema de cadastro de empresas sindicalizadas - Sistema Patronal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 antialiased">
        <UserProvider>
          <AuthGuard />
          <NavBar />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
