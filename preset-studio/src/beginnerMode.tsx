import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "cuvave-preset-studio:beginner-mode";

const BeginnerModeContext = createContext<[boolean, (v: boolean) => void]>([true, () => {}]);

export function BeginnerModeProvider({ children }: { readonly children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : saved === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // localStorage indisponível — não é crítico, só não vai lembrar a preferência.
    }
  }, [enabled]);

  return <BeginnerModeContext.Provider value={[enabled, setEnabled]}>{children}</BeginnerModeContext.Provider>;
}

export function useBeginnerMode() {
  return useContext(BeginnerModeContext);
}
