import { LIVE_PARAM_MAX, type LiveParamName } from "./protocol/live";

export type BlockId = "drive" | "delay" | "reverb" | "modulation" | "cabinet" | "output";

export interface KnobDef {
  readonly param: LiveParamName;
  readonly label: string;
  readonly help: string;
  readonly max: number;
}

export interface ToggleDef {
  readonly param: LiveParamName;
  readonly label: string;
  readonly help: string;
}

export interface BlockDef {
  readonly id: BlockId;
  readonly label: string;
  readonly accent: string;
  readonly knobs: readonly KnobDef[];
  readonly toggle?: ToggleDef;
}

export const BLOCKS: readonly BlockDef[] = [
  {
    id: "drive",
    label: "Drive / Pré-amp",
    accent: "#ff6b4a",
    knobs: [
      { param: "type", label: "Tipo de pré-amp", help: "Modelo de amplificador/overdrive (0 a 8)", max: LIVE_PARAM_MAX.type },
      { param: "gain", label: "Gain", help: "Quantidade de distorção/ganho", max: LIVE_PARAM_MAX.gain },
      { param: "tone", label: "Tom", help: "Equalização do pré-amp", max: LIVE_PARAM_MAX.tone },
    ],
    toggle: { param: "toneSection", label: "Bloco de tom ativo", help: "Liga/desliga o estágio de tom" },
  },
  {
    id: "delay",
    label: "Delay",
    accent: "#4a9eff",
    knobs: [
      { param: "time", label: "Tempo", help: "Tempo de repetição do eco", max: LIVE_PARAM_MAX.time },
      { param: "feedback", label: "Feedback", help: "Quantidade de repetições", max: LIVE_PARAM_MAX.feedback },
      { param: "mix", label: "Mix", help: "Equilíbrio entre som seco e com delay", max: LIVE_PARAM_MAX.mix },
    ],
    toggle: { param: "delaySection", label: "Delay ativo", help: "Liga/desliga o bloco de delay" },
  },
  {
    id: "reverb",
    label: "Reverb",
    accent: "#38c488",
    knobs: [{ param: "reverb", label: "Quantidade", help: "Intensidade do reverb", max: LIVE_PARAM_MAX.reverb }],
  },
  {
    id: "modulation",
    label: "Modulação",
    accent: "#c374ff",
    knobs: [
      {
        param: "modulation",
        label: "Chorus / Phaser",
        help: "0–6 chorus · 7–8 desligado · 9–15 phaser",
        max: LIVE_PARAM_MAX.modulation,
      },
    ],
  },
  {
    id: "cabinet",
    label: "Gabinete (IR)",
    accent: "#f2b84b",
    knobs: [
      { param: "cabinet", label: "Cabinet / IR", help: "Qual das 8 respostas de impulso usar", max: LIVE_PARAM_MAX.cabinet },
    ],
    toggle: { param: "irSection", label: "IR ativa", help: "Liga/desliga a simulação de gabinete" },
  },
  {
    id: "output",
    label: "Saída",
    accent: "#9aa4b2",
    knobs: [{ param: "volume", label: "Volume", help: "Volume final do preset", max: LIVE_PARAM_MAX.volume }],
  },
];
