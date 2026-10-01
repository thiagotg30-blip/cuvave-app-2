import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  readonly value: number;
  readonly min?: number;
  readonly max: number;
  readonly label: string;
  readonly valueLabel?: string;
  readonly help?: string;
  readonly accent: string;
  readonly disabled?: boolean;
  readonly onChange: (value: number) => void;
}

const SWEEP_START = -135; // graus
const SWEEP_END = 135;
const SWEEP = SWEEP_END - SWEEP_START;

function valueToAngle(value: number, min: number, max: number): number {
  const t = max === min ? 0 : (value - min) / (max - min);
  return SWEEP_START + t * SWEEP;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToXY(cx, cy, r, endAngle);
  const end = polarToXY(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

const SIZE = 64;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 7;

/** Knob giratório (arrasta verticalmente pra girar), visual de pedaleira. */
export function Knob({ value, min = 0, max, label, valueLabel, help, accent, disabled, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startY: number; startValue: number } | null>(null);

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, Math.round(v))), [min, max]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startValue: value };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    function handleMove(e: PointerEvent) {
      if (!dragState.current) return;
      const deltaY = dragState.current.startY - e.clientY;
      const range = max - min;
      // ~140px de arrasto cobre o curso inteiro do knob.
      const deltaValue = (deltaY / 140) * range;
      onChange(clamp(dragState.current.startValue + deltaValue));
    }
    function handleUp() {
      setDragging(false);
      dragState.current = null;
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, max, min]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(clamp(value + 1));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(clamp(value - 1));
    }
  }

  const angle = valueToAngle(value, min, max);
  const pointer = polarToXY(CENTER, CENTER, RADIUS - 4, angle);

  return (
    <div className={dragging ? "knob dragging" : "knob"} title={help}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        className={disabled ? "knob-svg disabled" : "knob-svg"}
      >
        <path
          d={describeArc(CENTER, CENTER, RADIUS, SWEEP_START, SWEEP_END)}
          className="knob-track"
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path
          d={describeArc(CENTER, CENTER, RADIUS, SWEEP_START, angle)}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <circle cx={CENTER} cy={CENTER} r={RADIUS - 11} className="knob-face" />
        <line x1={CENTER} y1={CENTER} x2={pointer.x} y2={pointer.y} stroke={accent} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <div className="knob-caption">
        <span className="knob-name">{label}</span>
        <span className="knob-val" style={{ color: accent }}>
          {valueLabel ?? value}
        </span>
      </div>
    </div>
  );
}
