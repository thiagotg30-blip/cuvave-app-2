import { BLOCKS } from "../blocks";
import type { LiveParamName } from "../protocol/live";
import type { PresetParams } from "../library/types";

interface Props {
  readonly params: PresetParams;
  readonly onChange: (param: LiveParamName, value: number) => void;
  readonly disabled?: boolean;
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
          {block.knobs.map((knob) => (
            <div className="knob-row" key={knob.param} title={knob.help}>
              <div className="knob-label">
                <span>{knob.label}</span>
                <span className="knob-value">{params[knob.param] ?? 0}</span>
              </div>
              <input
                type="range"
                min={0}
                max={knob.max}
                value={params[knob.param] ?? 0}
                disabled={disabled}
                style={{ accentColor: block.accent }}
                onChange={(e) => onChange(knob.param, Number(e.target.value))}
              />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
