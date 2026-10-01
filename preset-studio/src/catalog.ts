// Nomes dos 9 tipos de pré-amp do CUBE Baby, conforme o manual oficial
// (M-VAVE Cube Baby User Manual — tabela "Slot · Name · Type").
export interface PreampType {
  readonly value: number;
  readonly name: string;
  readonly category: "Clean" | "Overdrive" | "Distortion";
}

export const PREAMP_TYPES: readonly PreampType[] = [
  { value: 0, name: "Power-Zone Clean", category: "Clean" },
  { value: 1, name: "US Gold 100 Clean", category: "Clean" },
  { value: 2, name: "Two Stone Coral OD", category: "Overdrive" },
  { value: 3, name: "Doctor3 B", category: "Overdrive" },
  { value: 4, name: "Cali JP A", category: "Overdrive" },
  { value: 5, name: "Day Tripper OD", category: "Distortion" },
  { value: 6, name: "Shittcow Dist", category: "Distortion" },
  { value: 7, name: "Wo Stone Coral OD", category: "Distortion" },
  { value: 8, name: "Mr Smith Dist", category: "Distortion" },
];

export function preampTypeLabel(value: number): string {
  const found = PREAMP_TYPES.find((t) => t.value === value);
  return found ? `${found.name} (${found.category})` : `Tipo ${value}`;
}

/** 0–6 chorus · 7–8 desligado · 9–15 phaser (confirmado via engenharia reversa / manual). */
export function modulationLabel(value: number): string {
  if (value >= 0 && value <= 6) return `Chorus ${value}/6`;
  if (value === 7 || value === 8) return "Desligado";
  return `Phaser ${value - 8}/7`;
}

export function cabinetLabel(value: number): string {
  if (value === 0) return "Sem gabinete (bypass)";
  return `Cabinet ${value}`;
}
