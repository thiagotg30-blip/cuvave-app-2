import { BLOCKS, type BlockId } from "../blocks";
import type { LiveParamName } from "../protocol/live";
import type { PresetParams } from "../library/types";
import { PREAMP_TYPES, cabinetLabel, modulationLabel, preampTypeLabel } from "../catalog";
import { Knob } from "./Knob";
import { Switch } from "./Switch";
import { BLOCK_ICONS } from "./blockIcons";
import { useBeginnerMode } from "../beginnerMode";

interface Props {
  readonly params: PresetParams;
  readonly onChange: (param: LiveParamName, value: number) => void;
  readonly disabled?: boolean;
}

function helperLabel(param: LiveParamName, value: number): string | undefined {
  if (param === "modulation") return modulationLabel(value);
  if (param === "cabinet") return cabinetLabel(value);
  return undefined;
}

export function ParamEditor({ params, onChange, disabled }: Props) {
  const [beginnerMode] = useBeginnerMode();

  return (
    <div className="block-grid">
      {BLOCKS.map((block) => {
        const Icon = BLOCK_ICONS[block.id as BlockId];
        return (
          <section className="block-card" key={block.id} style={{ ["--block-accent" as string]: block.accent }}>
            <header className="block-card-header">
              <div className="block-title">
                <span className="block-icon" style={{ color: block.accent }}>
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <h3>{block.label}</h3>
              </div>
              {block.toggle && (
                <Switch
                  checked={params[block.toggle.param] === 1}
                  onChange={(checked) => onChange(block.toggle!.param, checked ? 1 : 0)}
                  label={block.toggle.label}
                  help={block.toggle.help}
                  disabled={disabled}
                  accent={block.accent}
                />
              )}
            </header>

            {beginnerMode && <p className="block-description">{block.description}</p>}
            {beginnerMode && block.toggle && params[block.toggle.param] !== 1 && (
              <p className="block-description muted-warning">{block.toggle.beginnerHelp}</p>
            )}

            {block.id === "drive" && (
              <div className="preamp-select">
                <span className="field-label">Tipo de pré-amp</span>
                <select
                  value={params.type}
                  disabled={disabled}
                  onChange={(e) => onChange("type", Number(e.target.value))}
                >
                  {PREAMP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.name} — {t.category}
                    </option>
                  ))}
                </select>
                <span className="field-hint">{preampTypeLabel(params.type)}</span>
                {beginnerMode && (
                  <span className="field-hint">
                    {block.knobs.find((k) => k.param === "type")?.beginnerHelp}
                  </span>
                )}
              </div>
            )}

            <div className="knob-cluster">
              {block.knobs
                .filter((k) => k.param !== "type")
                .map((knob) => (
                  <Knob
                    key={knob.param}
                    value={params[knob.param] ?? 0}
                    max={knob.max}
                    label={knob.label}
                    valueLabel={helperLabel(knob.param, params[knob.param] ?? 0)}
                    help={knob.help}
                    accent={block.accent}
                    disabled={disabled}
                    onChange={(v) => onChange(knob.param, v)}
                  />
                ))}
            </div>

            {beginnerMode && (
              <ul className="knob-explainers">
                {block.knobs
                  .filter((k) => k.param !== "type")
                  .map((knob) => (
                    <li key={knob.param}>
                      <strong>{knob.label}:</strong> {knob.beginnerHelp}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
