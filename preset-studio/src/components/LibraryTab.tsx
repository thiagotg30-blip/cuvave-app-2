import { useEffect, useRef, useState } from "react";
import { ParamEditor } from "./ParamEditor";
import type { CubeBabyClient } from "../midi/cubeBabyClient";
import type { PresetSlotId } from "../protocol/preset";
import type { LibraryPreset } from "../library/types";
import { listPresets, importPresets, removePreset, updatePreset } from "../library/storage";
import { parseImportedPresetFile, downloadJson, presetToFile, libraryToFile } from "../library/presetFile";
import { LIVE_PARAM_NAMES } from "../protocol/live";

export function LibraryTab({ client, connected }: { readonly client: CubeBabyClient; readonly connected: boolean }) {
  const [presets, setPresets] = useState<LibraryPreset[]>([]);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<LibraryPreset | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setPresets(listPresets());
  }

  useEffect(refresh, []);

  async function importFromFile(file: File) {
    try {
      const text = await file.text();
      const { presets: parsed, warnings } = parseImportedPresetFile(JSON.parse(text));
      if (parsed.length === 0) throw new Error("Nenhum preset reconhecível nesse arquivo.");
      importPresets(parsed);
      refresh();
      setStatus(`${parsed.length} preset(s) importado(s) de "${file.name}".${warnings.length ? " " + warnings.join(" ") : ""}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".json"));
    files.forEach((f) => void importFromFile(f));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Remover este preset da biblioteca?")) return;
    removePreset(id);
    refresh();
  }

  async function handleApply(preset: LibraryPreset) {
    if (!connected) {
      setStatus("Conecte o pedal na aba 'Pedal' antes de aplicar um preset no hardware.");
      return;
    }
    const slot = window.prompt("Gravar em qual slot? Digite A, B ou C.", "A");
    const normalized = slot?.trim().toUpperCase();
    if (normalized !== "A" && normalized !== "B" && normalized !== "C") return;
    const slotId = normalized as PresetSlotId;
    if (!window.confirm(`Gravar "${preset.name}" no slot ${slotId} do pedal agora? Isso substitui o que está lá.`)) return;
    try {
      for (const name of LIVE_PARAM_NAMES) {
        // eslint-disable-next-line no-await-in-loop
        await client.writeLiveParam(slotId, name, preset.params[name]);
      }
      setStatus(`"${preset.name}" gravado no slot ${slotId}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      className={dragOver ? "tab-content drop-zone drag-over" : "tab-content drop-zone"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="toolbar">
        <div>
          <strong>Biblioteca de presets</strong>
          <p className="muted">Arraste um arquivo .json aqui, ou use os botões. Funciona sem o pedal conectado.</p>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => fileInputRef.current?.click()}>Importar arquivo...</button>
          <button disabled={presets.length === 0} onClick={() => downloadJson("biblioteca-cube-baby.json", libraryToFile(presets))}>
            Exportar biblioteca inteira
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importFromFile(file);
            }}
          />
        </div>
      </div>

      {status && <p className="status-text">{status}</p>}

      {presets.length === 0 ? (
        <p className="muted">Nenhum preset salvo ainda. Importe um arquivo ou salve presets a partir da aba "Pedal".</p>
      ) : (
        <div className="preset-grid">
          {presets.map((preset) => (
            <div className="preset-card" key={preset.id}>
              <h4>{preset.name}</h4>
              {preset.notes && <p className="muted small">{preset.notes}</p>}
              <p className="small muted">
                Tipo {preset.params.type} · Gain {preset.params.gain} · Tom {preset.params.tone} · Cab {preset.params.cabinet}
              </p>
              <div className="preset-card-actions">
                <button onClick={() => setEditing(preset)}>Editar</button>
                <button onClick={() => downloadJson(`${preset.name.replace(/\s+/g, "-")}.json`, presetToFile(preset))}>Exportar</button>
                <button onClick={() => void handleApply(preset)}>Aplicar no pedal</button>
                <button className="danger" onClick={() => handleDelete(preset.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="preset-name-input"
              />
              <button onClick={() => setEditing(null)}>Fechar</button>
            </header>
            <ParamEditor
              params={editing.params}
              onChange={(param, value) => setEditing({ ...editing, params: { ...editing.params, [param]: value } })}
            />
            <footer className="modal-footer">
              <button
                onClick={() => {
                  updatePreset(editing.id, { name: editing.name, params: editing.params });
                  refresh();
                  setEditing(null);
                  setStatus(`"${editing.name}" atualizado.`);
                }}
              >
                Salvar alterações
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
