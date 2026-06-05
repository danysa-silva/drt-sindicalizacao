"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUsuario } from "./UserContext";

const LINKS = [
  { href: "/", label: "Empresas" },
  { href: "/sindicatos", label: "Sindicatos" },
  { href: "/conselhos", label: "Conselhos e Comitês" },
  { href: "/vinculos", label: "Vínculos" },
  { href: "/alteracoes", label: "Log de segurança" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login" || pathname === "/cadastro") return null;

  return (
    <header className="bg-blue-800 text-white shadow">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">DRT — Sistema Patronal</h1>
            <p className="text-xs text-blue-200">FIEAM — Cadastro de Empresas Sindicalizadas</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <nav className="flex gap-1 flex-wrap">
              {LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    pathname === href
                      ? "bg-white text-blue-800"
                      : "text-blue-100 hover:bg-blue-700"
                  }`}
                >
                  {label}
                </Link>
              ))}
              {usuario?.perfil === "admin" && (
                <Link
                  href="/usuarios"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    pathname === "/usuarios"
                      ? "bg-white text-blue-800"
                      : "text-blue-100 hover:bg-blue-700"
                  }`}
                >
                  Usuários
                </Link>
              )}
            </nav>
            {usuario && (
              <div className="flex items-center gap-2 border-l border-blue-600 pl-3">
                <div className="text-right">
                  <p className="text-xs font-medium text-white leading-none">{usuario.nome}</p>
                  <p className="text-[10px] text-blue-300 capitalize">{usuario.perfil}</p>
                </div>
                <button
                  onClick={sair}
                  className="rounded-md bg-blue-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
