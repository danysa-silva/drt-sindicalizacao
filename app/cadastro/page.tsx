"use client";

import { useState } from "react";
import Link from "next/link";

export default function CadastroPage() {
  const [form, setForm] = useState({ email: "", nome: "", senha: "", confirmar: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (form.senha !== form.confirmar) {
      setErro("As senhas não coincidem");
      return;
    }

    setCarregando(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, nome: form.nome, senha: form.senha }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json();
      setErro(data.error ?? "Erro ao criar conta");
    }
    setCarregando(false);
  }

  const inp = "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-800">DRT — Sistema Patronal</h1>
          <p className="text-sm text-gray-500 mt-1">FIEAM — Empresas Sindicalizadas</p>
        </div>

        <div className="rounded-xl bg-white border border-gray-200 shadow-sm px-6 py-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Criar conta</h2>
          <p className="text-xs text-gray-500 mb-6">Aceitos: @fieam.org.br, @sesi.org.br, @senai.org.br</p>

          {erro && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Seu nome"
                required
                className={inp}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
                required
                className={inp}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                required
                className={inp}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
              <input
                type="password"
                value={form.confirmar}
                onChange={(e) => setForm((f) => ({ ...f, confirmar: e.target.value }))}
                placeholder="Repita a senha"
                required
                className={inp}
              />
            </div>
            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition"
            >
              {carregando ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
