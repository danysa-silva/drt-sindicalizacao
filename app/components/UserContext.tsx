"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Usuario = { id: number; email: string; nome: string; perfil: string };

const UserContext = createContext<Usuario | null | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUsuario(data))
      .catch(() => setUsuario(null));
  }, []);

  return <UserContext.Provider value={usuario}>{children}</UserContext.Provider>;
}

export function useUsuario() {
  return useContext(UserContext);
}
