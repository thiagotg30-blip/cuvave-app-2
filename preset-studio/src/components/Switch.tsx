interface Props {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
  readonly help?: string;
  readonly disabled?: boolean;
  readonly accent?: string;
}

export function Switch({ checked, onChange, label, help, disabled, accent }: Props) {
  return (
    <label className="switch" title={help}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={checked ? "switch-track on" : "switch-track"}
        style={checked && accent ? { background: accent } : undefined}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" />
      </button>
      <span className="switch-label">{label}</span>
    </label>
  );
}
