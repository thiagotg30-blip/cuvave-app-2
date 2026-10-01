import { useRef, useState } from "react";
import type { CubeBabyClient, IrUploadProgress } from "../midi/cubeBabyClient";
import type { PresetSlotId } from "../protocol/preset";
import { StatusBanner, useStatus } from "./StatusBanner";
import { Box, UploadCloud, DownloadCloud } from "lucide-react";

interface Props {
  readonly client: CubeBabyClient;
  readonly connected: boolean;
  readonly slot: PresetSlotId;
}

const STEP_LABEL: Record<IrUploadProgress["step"], string> = {
  apagando: "Apagando o slot da ROM...",
  gravando: "Gravando a IR na ROM...",
  verificando: "Conferindo se gravou certo...",
  "selecionando-cabinet": "Selecionando o Cabinet no preset...",
  concluido: "Concluído.",
};

export function IrPanel({ client, connected, slot }: Props) {
  const [slotIndex, setSlotIndex] = useState(7); // 7 = Cabinet 8, slot "upload" recomendado
  const [progress, setProgress] = useState<IrUploadProgress | null>(null);
  const [status, setStatus] = useStatus();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (!connected) {
      setStatus("Conecte o pedal primeiro.", "error");
      return;
    }
    const risky = slotIndex !== 7;
    const confirmed = window.confirm(
      `Gravar "${file.name}" no slot de Cabinet ${slotIndex + 1}?\n\n` +
        (risky
          ? "⚠️ Esse é um dos 8 slots de fábrica — isso SUBSTITUI a resposta de impulso que já está lá. "
          : "Esse é o slot recomendado pra uploads (Cabinet 8). ") +
        "A operação apaga e regrava um setor de memória flash: não desligue o pedal nem feche esta aba durante o processo. Recomendado: faça isso num ambiente calmo e, se puder, exporte antes a IR atual desse slot como backup.",
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("", "info");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await client.loadIrFromWav(bytes, { slotIndex, slot, onProgress: setProgress });
      setStatus(
        result.verified
          ? `IR gravada com sucesso no Cabinet ${result.cabinet} e selecionada no preset ${slot}.`
          : `A gravação terminou, mas a verificação encontrou diferenças. Recomendo tentar de novo antes de confiar nesse slot.`,
        result.verified ? "success" : "error",
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleExport() {
    if (!connected) {
      setStatus("Conecte o pedal primeiro.", "error");
      return;
    }
    setBusy(true);
    setStatus("Lendo IR do pedal...", "busy");
    try {
      const wav = await client.exportIrRomToWav(slotIndex, (pct) => setProgress({ step: "verificando", pct }));
      const blob = new Blob([wav.slice().buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cube-baby-ir-cabinet-${slotIndex + 1}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`IR do Cabinet ${slotIndex + 1} exportada como .wav.`, "success");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <section className="panel ir-panel">
      <header className="panel-title">
        <Box size={16} />
        <span>Gabinetes / Respostas de impulso (IR)</span>
      </header>
      <p className="muted small">
        Carregue um arquivo .wav com uma resposta de impulso de gabinete num dos 8 slots do pedal. Operação mais
        demorada e arriscada que editar knobs — leia o aviso antes de confirmar.
      </p>

      <div className="connect-row">
        <label>
          Slot de Cabinet
          <select value={slotIndex} onChange={(e) => setSlotIndex(Number(e.target.value))} disabled={busy}>
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i} value={i}>
                Cabinet {i + 1}
                {i === 7 ? " (recomendado para upload)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" disabled={!connected || busy} onClick={() => fileRef.current?.click()}>
          <UploadCloud size={15} /> Importar .wav
        </button>
        <button className="btn" disabled={!connected || busy} onClick={() => void handleExport()}>
          <DownloadCloud size={15} /> Exportar .wav
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/wav,.wav"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleUpload(file);
          }}
        />
      </div>

      {progress && (
        <div className="progress-row">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
          </div>
          <span className="muted small">
            {STEP_LABEL[progress.step]} ({progress.pct}%)
          </span>
        </div>
      )}

      <StatusBanner status={status} />
      {!connected && <p className="hint-text">Conecte o pedal na seção acima para usar upload/exportação de IR.</p>}
    </section>
  );
}
