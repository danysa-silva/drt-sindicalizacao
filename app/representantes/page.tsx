"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUsuario } from "../components/UserContext";
import ListaRepresentantes from "../components/ListaRepresentantes";

export default function RepresentantesPage() {
  const usuario = useUsuario();
  const router = useRouter();

  useEffect(() => {
    if (usuario !== undefined && usuario?.perfil !== "admin") {
      router.replace("/");
    }
  }, [usuario, router]);

  if (!usuario || usuario.perfil !== "admin") return null;

  return <ListaRepresentantes />;
}
