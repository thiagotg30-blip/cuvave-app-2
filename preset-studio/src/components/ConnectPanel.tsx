import { useEffect, useState } from "react";
import { CubeBabyClient, type MidiPortInfo } from "../midi/cubeBabyClient";

interface Props {
  readonly client: CubeBabyClient;
  readonly connected: boolean;
  readonly deviceName: string | null;
  readonly onConnected: (identified: string | null) => void;
  readonly onDisconnected: () => void;
}

const CUBE_HINT = /(cube|mvave|m-vave|sinco)/i;

export function ConnectPanel({ client, connected, deviceName, onConnected, onDisconnected }: Props) {
  const [supported, setSupported] = useState(true);
  const [inputs, setInputs] = useState<MidiPortInfo[]>([]);
  const [outputs, setOutputs] = useState<MidiPortInfo[]>([]);
  const [inputId, setInputId] = useState<string>("");
  const [outputId, setOutputId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CubeBabyClient.isSupported()) {
      setSupported(false);
      return;
    }
    client
      .listPorts()
      .then(({ inputs, outputs }) => {
        setInputs(inputs);
        setOutputs(outputs);
        const guessIn = inputs.find((p) => CUBE_HINT.test(p.name)) ?? inputs[0];
        const guessOut = outputs.find((p) => CUBE_HINT.test(p.name)) ?? outputs[0];
        if (guessIn) setInputId(guessIn.id);
        if (guessOut) setOutputId(guessOut.id);
      })
      .catch((err) => setStatus(String(err.message ?? err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) {
    return (
      <div className="panel warning">
        <strong>Seu navegador não suporta a Web MIDI API.</strong>
        <p>Abra esta página no Google Chrome ou Microsoft Edge, no computador onde o pedal está plugado via USB.</p>
      </div>
    );
  }

  async function handleConnect() {
    setBusy(true);
    setStatus("Conectando...");
    try {
      await client.connect(inputId, outputId);
      let name: string | null = null;
      try {
        name = await client.identify(1500);
      } catch {
        name = null;
      }
      setStatus("");
      onConnected(name);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    await client.disconnect();
    onDisconnected();
  }

  if (connected) {
    return (
      <div className="panel connected">
        <div>
          <strong>Pedal conectado</strong>
          <span className="muted"> {deviceName ? `· identificado como "${deviceName}"` : "· sem resposta de identificação (ok para alguns modelos)"}</span>
        </div>
        <button onClick={() => void handleDisconnect()}>Desconectar</button>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="connect-row">
        <label>
          Entrada MIDI
          <select value={inputId} onChange={(e) => setInputId(e.target.value)}>
            <option value="">Selecione...</option>
            {inputs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Saída MIDI
          <select value={outputId} onChange={(e) => setOutputId(e.target.value)}>
            <option value="">Selecione...</option>
            {outputs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!inputId || !outputId || busy} onClick={() => void handleConnect()}>
          {busy ? "Conectando..." : "Conectar"}
        </button>
      </div>
      {status && <p className="status-text">{status}</p>}
      {inputs.length === 0 && (
        <p className="muted">
          Nenhuma porta MIDI encontrada. Plugue o CUBE Baby via USB e clique em "Permitir" quando o navegador pedir acesso a
          dispositivos MIDI.
        </p>
      )}
    </div>
  );
}
