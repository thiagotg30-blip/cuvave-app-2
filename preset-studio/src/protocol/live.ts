import { PRESET_SLOT_BYTE_LENGTH, type PresetSlotId } from "./preset";

/** Memória de parâmetros "ao vivo" (edição em tempo real), seletor de memória = 5. */
export const LIVE_PARAM_MEMORY = 5;
export const LIVE_PARAM_BASE_ADDRESS = 0x8000_0000;
export const BANK_MEMORY = 5;
export const BANK_ADDRESS = 0x0000_0000;

export const LIVE_PARAM_NAMES = [
  "type",
  "gain",
  "tone",
  "reverb",
  "feedback",
  "volume",
  "time",
  "mix",
  "modulation",
  "cabinet",
  "irSection",
  "delaySection",
  "toneSection",
] as const;

export type LiveParamName = (typeof LIVE_PARAM_NAMES)[number];

/** Limites reportados pela engenharia reversa comunitária (CubeControl/ToneHub). */
export const LIVE_PARAM_MAX: Readonly<Record<LiveParamName, number>> = {
  type: 8,
  gain: 7,
  tone: 15,
  reverb: 15,
  feedback: 127,
  volume: 127,
  time: 31,
  mix: 118,
  modulation: 15,
  cabinet: 8,
  irSection: 1,
  delaySection: 1,
  toneSection: 1,
};

export const LIVE_PARAM_BANK_OFFSET: Readonly<Record<LiveParamName, number>> = {
  type: 0,
  gain: 1,
  tone: 2,
  reverb: 3,
  feedback: 4,
  volume: 5,
  time: 6,
  mix: 7,
  modulation: 8,
  cabinet: 9,
  irSection: 10,
  delaySection: 11,
  toneSection: 12,
};

const SLOT_INDEX: Readonly<Record<PresetSlotId, number>> = { A: 0, B: 1, C: 2 };

export function clampLiveParamValue(name: LiveParamName, value: number): number {
  if (!Number.isFinite(value)) return 0;
  const max = LIVE_PARAM_MAX[name];
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function liveParamAddress(name: LiveParamName, slot: PresetSlotId): number {
  const slotIndex = SLOT_INDEX[slot];
  return LIVE_PARAM_BASE_ADDRESS + slotIndex * PRESET_SLOT_BYTE_LENGTH + LIVE_PARAM_BANK_OFFSET[name];
}

export const MODULATION_OFF = 8;
export function isModulationOff(value: number): boolean {
  return value === 7 || value === 8;
}
