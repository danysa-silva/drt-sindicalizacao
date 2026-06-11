"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUsuario } from "./UserContext";

const LINKS = [
  { href: "/",           label: "Empresas Sindicalizadas" },
  { href: "/sindicatos", label: "Sindicatos Filiados" },
  { href: "/conselhos",  label: "Conselhos e Comitês" },
  { href: "/vinculos",   label: "Vínculos" },
  { href: "/alteracoes", label: "Log de Segurança" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();
  const [aberto, setAberto] = useState(false);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login" || pathname === "/cadastro") return null;

  const adminLinks = usuario?.perfil === "admin"
    ? [{ href: "/representantes", label: "Representantes" }, { href: "/usuarios", label: "Usuários" }]
    : [];
  const todosLinks = [...LINKS, ...adminLinks];

  function linkClass(href: string) {
    return `block rounded-md px-3 py-2 text-sm font-medium transition ${
      pathname === href ? "bg-white text-blue-800" : "text-blue-100 hover:bg-blue-700"
    }`;
  }

  return (
    <header className="bg-blue-800 text-white shadow">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">

        {/* Linha principal */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight leading-tight sm:text-lg">DRT — Sistema Patronal</h1>
            <p className="text-xs text-blue-200 leading-tight">FIEAM — Empresas Sindicalizadas</p>
          </div>

          {/* Desktop: nav + usuário */}
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <nav className="flex gap-1 flex-wrap">
              {todosLinks.map(({ href, label }) => (
                <Link key={href} href={href} className={linkClass(href)}>{label}</Link>
              ))}
            </nav>
            {usuario && (
              <div className="flex items-center gap-2 border-l border-blue-600 pl-3 ml-1">
                <div className="text-right">
                  <p className="text-xs font-medium text-white leading-none">{usuario.nome}</p>
                  <p className="text-[10px] text-blue-300 capitalize">{usuario.perfil}</p>
                </div>
                <button onClick={sair} className="rounded-md bg-blue-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition">
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* Mobile: botão hambúrguer */}
          <button
            onClick={() => setAberto((v) => !v)}
            aria-label="Menu"
            className="sm:hidden flex flex-col justify-center items-center w-9 h-9 rounded-md hover:bg-blue-700 transition gap-1.5"
          >
            <span className={`block h-0.5 w-5 bg-white transition-transform origin-center ${aberto ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 w-5 bg-white transition-opacity ${aberto ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-white transition-transform origin-center ${aberto ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>

        {/* Mobile: menu expandido */}
        {aberto && (
          <div className="sm:hidden mt-3 pt-3 border-t border-blue-700 space-y-0.5">
            {todosLinks.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setAberto(false)} className={linkClass(href)}>
                {label}
              </Link>
            ))}
            {usuario && (
              <div className="flex items-center justify-between px-3 py-2.5 mt-2 border-t border-blue-700">
                <div>
                  <p className="text-sm font-medium text-white">{usuario.nome}</p>
                  <p className="text-xs text-blue-300 capitalize">{usuario.perfil}</p>
                </div>
                <button onClick={sair} className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition">
                  Sair
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
