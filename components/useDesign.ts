"use client";

import { useCallback, useEffect, useState } from "react";
import { RocketDesignSchema, type RocketDesign } from "@/lib/design";
import { STARTER_DESIGN } from "@/lib/presets";

const CURRENT_KEY = "space-agent:design:v1";
const SAVED_KEY = "space-agent:saved:v1";

export type SavedProject = { name: string; savedAt: number; design: RocketDesign };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* navegador sem armazenamento: segue sem salvar */
  }
}

/** Projeto aberto no construtor + projetos salvos, guardados neste navegador. */
export function useDesign() {
  const [design, setDesignState] = useState<RocketDesign>(STARTER_DESIGN);
  const [saved, setSaved] = useState<SavedProject[]>([]);

  useEffect(() => {
    const current = RocketDesignSchema.safeParse(read(CURRENT_KEY));
    if (current.success) setDesignState(current.data);
    const list = read<SavedProject[]>(SAVED_KEY);
    if (Array.isArray(list)) setSaved(list.filter((p) => RocketDesignSchema.safeParse(p.design).success));
  }, []);

  const setDesign = useCallback((next: RocketDesign | ((d: RocketDesign) => RocketDesign)) => {
    setDesignState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      write(CURRENT_KEY, value);
      return value;
    });
  }, []);

  const save = useCallback(() => {
    setSaved((list) => {
      const next = [{ name: design.name, savedAt: Date.now(), design }, ...list.filter((p) => p.name !== design.name)].slice(0, 12);
      write(SAVED_KEY, next);
      return next;
    });
  }, [design]);

  const remove = useCallback((name: string) => {
    setSaved((list) => {
      const next = list.filter((p) => p.name !== name);
      write(SAVED_KEY, next);
      return next;
    });
  }, []);

  return { design, setDesign, saved, save, remove };
}
