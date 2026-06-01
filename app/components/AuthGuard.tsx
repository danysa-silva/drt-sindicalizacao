"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUsuario } from "./UserContext";

const PUBLICAS = ["/login", "/cadastro"];

export default function AuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();
  const isPublica = PUBLICAS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isPublica) return;
    if (usuario === null) {
      router.replace("/login");
    }
  }, [usuario, isPublica, router]);

  // Enquanto verifica sessão em página protegida, bloqueia o conteúdo
  if (!isPublica && usuario === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Verificando sessão...</p>
      </div>
    );
  }

  return null;
}
