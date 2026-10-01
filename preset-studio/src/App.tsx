import { useEffect, useMemo, useRef, useState } from "react";
import { PedalTab } from "./components/PedalTab";
import { LibraryTab } from "./components/LibraryTab";
import { CubeBabyClient } from "./midi/cubeBabyClient";
import { Guitar, Sliders, Library } from "lucide-react";
import { BeginnerModeProvider, useBeginnerMode } from "./beginnerMode";
import { Switch } from "./components/Switch";

type Tab = "pedal" | "library";

export function App() {
  return (
    <BeginnerModeProvider>
      <AppShell />
    </BeginnerModeProvider>
  );
}

function AppShell() {
  const client = useMemo(() => new CubeBabyClient(), []);
  const [tab, setTab] = useState<Tab>("pedal");
  const [pedalConnected, setPedalConnected] = useState(false);
  const [beginnerMode, setBeginnerMode] = useBeginnerMode();

  return (
    <div className="app">
      <div className="app-glow" aria-hidden="true" />
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Guitar size={22} strokeWidth={2.2} />
          </span>
          <div>
            <h1>
              CUBE Baby <span className="brand-accent">Preset Studio</span>
            </h1>
            <p className="muted">
              Editor não oficial para o pedal M-VAVE / CUVAVE CUBE Baby — importe presets de arquivo, organize sua
              biblioteca e edite de um jeito mais direto que o CubeSuite.
            </p>
          </div>
        </div>
        <div className="header-controls">
          <nav className="tabs">
            <button className={tab === "pedal" ? "tab active" : "tab"} onClick={() => setTab("pedal")}>
              <Sliders size={16} /> Pedal
            </button>
            <button className={tab === "library" ? "tab active" : "tab"} onClick={() => setTab("library")}>
              <Library size={16} /> Biblioteca
            </button>
          </nav>
          <Switch
            checked={beginnerMode}
            onChange={setBeginnerMode}
            label="Modo iniciante (explica tudo)"
            help="Mostra explicações em linguagem simples do que cada ajuste faz"
          />
        </div>
      </header>

      {tab === "pedal" ? (
        <PedalTabWrapper client={client} onConnectionChange={setPedalConnected} />
      ) : (
        <LibraryTab client={client} connected={pedalConnected} />
      )}

      <footer className="app-footer">
        <p className="muted small">
          Projeto independente, não afiliado à M-VAVE/CUVAVE. Protocolo USB baseado em engenharia reversa comunitária
          (projetos de código aberto <code>cuvave-midi</code> e <code>cubecontrol</code>/ToneHub). Use por sua conta e
          risco — faça backup dos seus presets antes de gravar no pedal.
        </p>
      </footer>
    </div>
  );
}

// Pequeno wrapper só para capturar o estado "conectado" do PedalTab sem duplicar lógica.
function PedalTabWrapper({
  client,
  onConnectionChange,
}: {
  readonly client: CubeBabyClient;
  readonly onConnectionChange: (connected: boolean) => void;
}) {
  // O estado de conexão em si mora dentro do PedalTab (via ConnectPanel); aqui só espelhamos
  // através do getter do client para a aba Biblioteca saber se pode "aplicar no pedal".
  useInterval(() => onConnectionChange(client.connected), 500);
  return <PedalTab client={client} />;
}

function useInterval(callback: () => void, delayMs: number) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;
  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs]);
}
