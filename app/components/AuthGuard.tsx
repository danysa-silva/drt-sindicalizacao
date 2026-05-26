"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUsuario } from "./UserContext";

const PUBLICAS = ["/login", "/cadastro"];

export default function AuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();

  useEffect(() => {
    if (PUBLICAS.some((p) => pathname.startsWith(p))) return;
    if (usuario === null) {
      router.replace("/login");
    }
  }, [usuario, pathname, router]);

  return null;
}
