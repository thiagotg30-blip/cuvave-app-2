import { BLOCKS } from "../blocks";
import type { LiveParamName } from "../protocol/live";
import type { PresetParams } from "../library/types";
import { PREAMP_TYPES, cabinetLabel, modulationLabel, preampTypeLabel } from "../catalog";

interface Props {
  readonly params: PresetParams;
  readonly onChange: (param: LiveParamName, value: number) => void;
  readonly disabled?: boolean;
}

function helperLabel(param: LiveParamName, value: number): string | null {
  if (param === "type") return preampTypeLabel(value);
  if (param === "modulation") return modulationLabel(value);
  if (param === "cabinet") return cabinetLabel(value);
  return null;
}

export function ParamEditor({ params, onChange, disabled }: Props) {
  return (
    <div className="block-grid">
      {BLOCKS.map((block) => (
        <section className="block-card" key={block.id} style={{ borderTopColor: block.accent }}>
          <header>
            <h3>{block.label}</h3>
            {block.toggle && (
              <label className="toggle" title={block.toggle.help}>
                <input
                  type="checkbox"
                  checked={params[block.toggle.param] === 1}
                  disabled={disabled}
                  onChange={(e) => onChange(block.toggle!.param, e.target.checked ? 1 : 0)}
                />
                <span>{block.toggle.label}</span>
              </label>
            )}
          </header>
          {block.knobs.map((knob) => {
            const value = params[knob.param] ?? 0;
            const helper = helperLabel(knob.param, value);
            return (
              <div className="knob-row" key={knob.param} title={knob.help}>
                <div className="knob-label">
                  <span>{knob.label}</span>
                  <span className="knob-value">{helper ?? value}</span>
                </div>
                {knob.param === "type" ? (
                  <select
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(knob.param, Number(e.target.value))}
                  >
                    {PREAMP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.name} — {t.category}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="range"
                    min={0}
                    max={knob.max}
                    value={value}
                    disabled={disabled}
                    style={{ accentColor: block.accent }}
                    onChange={(e) => onChange(knob.param, Number(e.target.value))}
                  />
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
