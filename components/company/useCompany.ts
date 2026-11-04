"use client";

import { useCallback, useEffect, useState } from "react";
import type { Company } from "@/lib/company";

const KEY = "space-agent:company:v1";

/** Empresa do simulador, guardada neste navegador. */
export function useCompany() {
  const [company, setCompanyState] = useState<Company | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Company) : null;
      if (parsed?.version === 1) setCompanyState(parsed);
    } catch {
      /* sem armazenamento: começa sem empresa */
    }
  }, []);

  const setCompany = useCallback((next: Company | null) => {
    setCompanyState(next);
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else localStorage.removeItem(KEY);
    } catch {
      /* segue sem salvar */
    }
  }, []);

  return { company, setCompany };
}
