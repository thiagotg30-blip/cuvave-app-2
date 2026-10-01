import { useState } from "react";
import { STARTER_PRESETS, type StarterPreset } from "../library/starterPresets";
import { preampTypeLabel, modulationLabel, cabinetLabel } from "../catalog";
import { Sparkles, PlusCircle, Check, ChevronDown } from "lucide-react";

interface Props {
  readonly existingNames: readonly string[];
  readonly onAdd: (preset: StarterPreset) => void;
}

export function StarterPresets({ existingNames, onAdd }: Props) {
  const [open, setOpen] = useState(true);
  const existing = new Set(existingNames);

  return (
    <section className="starter-presets">
      <button className="onboarding-toggle" onClick={() => setOpen((v) => !v)}>
        <Sparkles size={16} />
        <span>Presets de exemplo (comece por aqui)</span>
        <ChevronDown size={16} className={open ? "chev open" : "chev"} />
      </button>
      {open && (
        <>
          <p className="muted small">
            Sons prontos cobrindo os principais recursos do pedal — limpo, overdrive, distorção, delay, reverb e
            modulação. Adicione o(s) que fizer(em) sentido pra sua biblioteca e ajuste a partir daí.
          </p>
          <div className="preset-grid">
            {STARTER_PRESETS.map((preset) => {
              const already = existing.has(preset.name);
              return (
                <div className="preset-card starter-card" key={preset.id}>
                  <div className="preset-card-top">
                    <span className="preset-swatch" style={{ background: swatchFor(preset) }} />
                    <h4>{preset.name}</h4>
                  </div>
                  <p className="muted small">{preset.description}</p>
                  <p className="preset-meta">
                    {preampTypeLabel(preset.params.type)} · Gain {preset.params.gain} ·{" "}
                    {modulationLabel(preset.params.modulation)} · {cabinetLabel(preset.params.cabinet)}
                  </p>
                  <div className="preset-card-actions">
                    <button className="btn btn-small" disabled={already} onClick={() => onAdd(preset)}>
                      {already ? (
                        <>
                          <Check size={14} /> Já está na biblioteca
                        </>
                      ) : (
                        <>
                          <PlusCircle size={14} /> Adicionar à biblioteca
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function swatchFor(preset: StarterPreset): string {
  const hue = (preset.params.type * 37 + preset.params.cabinet * 11) % 360;
  return `hsl(${hue} 70% 55%)`;
}
