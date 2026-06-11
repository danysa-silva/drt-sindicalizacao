"use client";

import { useEffect } from "react";

type Props = {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  largo?: boolean;
};

export default function Modal({ titulo, onFechar, children, largo }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <div className={`w-full ${largo ? "sm:max-w-5xl" : "sm:max-w-2xl"} rounded-t-2xl sm:rounded-xl bg-white shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[90vh]`}>
        <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-800 sm:text-lg">{titulo}</h2>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
