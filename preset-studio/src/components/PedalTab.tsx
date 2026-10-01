import { useCallback, useRef, useState } from "react";
import { ParamEditor } from "./ParamEditor";
import { ConnectPanel } from "./ConnectPanel";
import { IrPanel } from "./IrPanel";
import { StatusBanner, useStatus } from "./StatusBanner";
import { CubeBabyClient } from "../midi/cubeBabyClient";
import type { PresetSlotId } from "../protocol/preset";
import { LIVE_PARAM_NAMES, type LiveParamName } from "../protocol/live";
import type { PresetParams } from "../library/types";
import { parseImportedPresetFile, downloadJson, presetToFile } from "../library/presetFile";
import { addPreset, importPresets } from "../library/storage";
import { DownloadCloud, UploadCloud, Save, RefreshCw, Cable } from "lucide-react";

const EMPTY_PARAMS: PresetParams = Object.fromEntries(LIVE_PARAM_NAMES.map((n) => [n, 0])) as PresetParams;

const SLOTS: PresetSlotId[] = ["A", "B", "C"];

export function PedalTab({ client }: { readonly client: CubeBabyClient }) {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [slot, setSlot] = useState<PresetSlotId>("A");
  const [slotParams, setSlotParams] = useState<Record<PresetSlotId, PresetParams>>({
    A: EMPTY_PARAMS,
    B: EMPTY_PARAMS,
    C: EMPTY_PARAMS,
  });
  const [status, setStatus] = useStatus();
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const writeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const currentParams = slotParams[slot];

  const setParams = useCallback(
    (updater: (prev: PresetParams) => PresetParams) => {
      setSlotParams((prev) => ({ ...prev, [slot]: updater(prev[slot]) }));
    },
    [slot],
  );

  function handleParamChange(param: LiveParamName, value: number) {
    setParams((prev) => ({ ...prev, [param]: value }));
    if (!connected) return;
    const key = `${slot}:${param}`;
    clearTimeout(writeTimers.current[key]);
    writeTimers.current[key] = setTimeout(() => {
      client.writeLiveParam(slot, param, value).catch((err) => setStatus(`Falha ao gravar ${param}: ${err.message ?? err}`, "error"));
    }, 60);
  }

  async function handleReadFromPedal() {
    setBusy(true);
    setStatus("Lendo presets do pedal...", "busy");
    try {
      const bank = await client.readPresetBank();
      const next: Record<PresetSlotId, PresetParams> = { A: EMPTY_PARAMS, B: EMPTY_PARAMS, C: EMPTY_PARAMS };
      for (const s of bank.slots) {
        next[s.slot] = {
          type: s.type,
          gain: s.gain,
          tone: s.tone,
          reverb: s.reverb,
          feedback: s.feedback,
          volume: s.volume,
          time: s.time,
          mix: s.mix,
          modulation: s.modulation,
          cabinet: s.cabinet,
          irSection: s.irSection,
          delaySection: s.delaySection,
          toneSection: s.toneSection,
        };
      }
      setSlotParams(next);
      setStatus("Presets lidos com sucesso.", "success");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function writeAllParamsToDevice(params: PresetParams) {
    for (const name of LIVE_PARAM_NAMES) {
      // eslint-disable-next-line no-await-in-loop
      await client.writeLiveParam(slot, name, params[name]);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const { presets, warnings } = parseImportedPresetFile(JSON.parse(text));
      if (presets.length === 0) throw new Error("O arquivo não continha nenhum preset reconhecível.");
      const chosen = presets[0];
      setParams(() => chosen.params);
      setStatus(
        `Importado "${chosen.name}" para o editor do slot ${slot}.` +
          (presets.length > 1 ? ` (o arquivo tinha ${presets.length} presets; os demais ficam disponíveis na aba Biblioteca)` : "") +
          (warnings.length ? ` — ${warnings.join(" ")}` : ""),
        "success",
      );
      if (presets.length > 1) {
        importPresets(presets.slice(1));
      }
      if (connected) {
        const confirmed = window.confirm(
          `Gravar os valores importados ("${chosen.name}") direto no slot ${slot} do pedal agora?\n\nRecomendado: faça antes um backup do preset atual (botão "Exportar este slot").`,
        );
        if (confirmed) {
          setBusy(true);
          await writeAllParamsToDevice(chosen.params);
          setBusy(false);
          setStatus(`"${chosen.name}" gravado no slot ${slot} do pedal.`, "success");
        }
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), "error");
    }
  }

  function handleExportSlot() {
    const file = presetToFile({
      id: "export",
      name: `CUBE Baby - Slot ${slot}`,
      params: currentParams,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    downloadJson(`cube-baby-slot-${slot}.json`, file);
    setStatus(`Slot ${slot} exportado.`, "success");
  }

  function handleSaveToLibrary() {
    const name = window.prompt("Nome para salvar este preset na biblioteca:", `Slot ${slot} - ${new Date().toLocaleDateString()}`);
    if (!name) return;
    addPreset(name, currentParams);
    setStatus(`Preset "${name}" salvo na biblioteca.`, "success");
  }

  return (
    <div className="tab-content">
      <ConnectPanel
        client={client}
        connected={connected}
        deviceName={deviceName}
        onConnected={(name) => {
          setConnected(true);
          setDeviceName(name);
        }}
        onDisconnected={() => {
          setConnected(false);
          setDeviceName(null);
        }}
      />

      <div className="toolbar">
        <div className="slot-tabs" role="tablist" aria-label="Preset">
          {SLOTS.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={s === slot}
              className={s === slot ? "footswitch active" : "footswitch"}
              onClick={() => setSlot(s)}
            >
              <span className="footswitch-led" />
              {s}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button className="btn" disabled={!connected || busy} onClick={() => void handleReadFromPedal()}>
            <RefreshCw size={15} /> Ler do pedal
          </button>
          <button className="btn" onClick={handleImportClick}>
            <UploadCloud size={15} /> Importar arquivo
          </button>
          <button className="btn" onClick={handleExportSlot}>
            <DownloadCloud size={15} /> Exportar slot
          </button>
          <button className="btn" onClick={handleSaveToLibrary}>
            <Save size={15} /> Salvar na biblioteca
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(e) => void handleFileChosen(e)} />
        </div>
      </div>

      <StatusBanner status={status} />
      {!connected && (
        <p className="hint-text">
          <Cable size={14} /> Sem pedal conectado: você ainda pode importar, editar e exportar arquivos de preset
          normalmente. Para gravar no hardware, conecte o USB acima.
        </p>
      )}

      <ParamEditor params={currentParams} onChange={handleParamChange} disabled={busy} />

      <IrPanel client={client} connected={connected} slot={slot} />
    </div>
  );
}
