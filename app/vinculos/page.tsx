"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUsuario } from "../components/UserContext";
import ConsultaVinculos from "../components/ConsultaVinculos";

export default function VinculosPage() {
  const usuario = useUsuario();
  const router = useRouter();

  useEffect(() => {
    if (usuario !== undefined && usuario?.perfil !== "admin" && usuario?.perfil !== "editor") {
      router.replace("/");
    }
  }, [usuario, router]);

  if (!usuario || (usuario.perfil !== "admin" && usuario.perfil !== "editor")) return null;

  return <ConsultaVinculos />;
}
