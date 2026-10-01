import { useEffect, useRef, useState } from "react";
import { ParamEditor } from "./ParamEditor";
import { StatusBanner, useStatus } from "./StatusBanner";
import type { CubeBabyClient } from "../midi/cubeBabyClient";
import type { PresetSlotId } from "../protocol/preset";
import type { LibraryPreset } from "../library/types";
import { listPresets, importPresets, removePreset, updatePreset } from "../library/storage";
import { parseImportedPresetFile, downloadJson, presetToFile, libraryToFile } from "../library/presetFile";
import { LIVE_PARAM_NAMES } from "../protocol/live";
import { preampTypeLabel } from "../catalog";
import { UploadCloud, Download, PencilLine, Trash2, Zap, FolderOpen, X } from "lucide-react";

export function LibraryTab({ client, connected }: { readonly client: CubeBabyClient; readonly connected: boolean }) {
  const [presets, setPresets] = useState<LibraryPreset[]>([]);
  const [status, setStatus] = useStatus();
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
      setStatus(`${parsed.length} preset(s) importado(s) de "${file.name}".${warnings.length ? " " + warnings.join(" ") : ""}`, "success");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), "error");
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
      setStatus("Conecte o pedal na aba 'Pedal' antes de aplicar um preset no hardware.", "error");
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
      setStatus(`"${preset.name}" gravado no slot ${slotId}.`, "success");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), "error");
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
          <h2 className="section-title">Biblioteca de presets</h2>
          <p className="muted small">Arraste um arquivo .json aqui, ou use os botões. Funciona sem o pedal conectado.</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={15} /> Importar arquivo
          </button>
          <button className="btn" disabled={presets.length === 0} onClick={() => downloadJson("biblioteca-cube-baby.json", libraryToFile(presets))}>
            <Download size={15} /> Exportar tudo
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

      <StatusBanner status={status} />

      {presets.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={32} />
          <p>Nenhum preset salvo ainda.</p>
          <p className="muted small">Importe um arquivo .json ou salve presets a partir da aba "Pedal".</p>
        </div>
      ) : (
        <div className="preset-grid">
          {presets.map((preset) => (
            <div className="preset-card" key={preset.id}>
              <div className="preset-card-top">
                <span className="preset-swatch" style={{ background: swatchFor(preset) }} />
                <h4>{preset.name}</h4>
              </div>
              {preset.notes && <p className="muted small">{preset.notes}</p>}
              <p className="preset-meta">
                {preampTypeLabel(preset.params.type)} · Gain {preset.params.gain} · Cab {preset.params.cabinet}
              </p>
              <div className="preset-card-actions">
                <button className="icon-btn" title="Editar" onClick={() => setEditing(preset)}>
                  <PencilLine size={15} />
                </button>
                <button className="icon-btn" title="Exportar" onClick={() => downloadJson(`${preset.name.replace(/\s+/g, "-")}.json`, presetToFile(preset))}>
                  <Download size={15} />
                </button>
                <button className="icon-btn" title="Aplicar no pedal" onClick={() => void handleApply(preset)}>
                  <Zap size={15} />
                </button>
                <button className="icon-btn danger" title="Excluir" onClick={() => handleDelete(preset.id)}>
                  <Trash2 size={15} />
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
              <button className="icon-btn" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </header>
            <ParamEditor
              params={editing.params}
              onChange={(param, value) => setEditing({ ...editing, params: { ...editing.params, [param]: value } })}
            />
            <footer className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  updatePreset(editing.id, { name: editing.name, params: editing.params });
                  refresh();
                  setEditing(null);
                  setStatus(`"${editing.name}" atualizado.`, "success");
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

function swatchFor(preset: LibraryPreset): string {
  const hue = (preset.params.type * 37 + preset.params.cabinet * 11) % 360;
  return `hsl(${hue} 70% 55%)`;
}
