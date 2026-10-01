import type { PresetParams } from "./types";

/**
 * Presets de exemplo prontos para uso, cobrindo as principais possibilidades sonoras
 * do CUBE Baby (tipos de pré-amp, delay, reverb, modulação e cabinet/IR). Servem como
 * ponto de partida para quem está começando — nenhum deles depende de arquivos externos.
 *
 * Os valores respeitam os limites reais de cada parâmetro (ver protocol/live.ts) e foram
 * escolhidos para ilustrar um uso típico de cada recurso, não para serem "perfeitos" —
 * a ideia é dar um bom ponto de partida pra ajustar a partir daí.
 */
export interface StarterPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly params: PresetParams;
}

export const STARTER_PRESETS: readonly StarterPreset[] = [
  {
    id: "clean-cristalino",
    name: "Limpo cristalino",
    description: "Som limpo e brilhante, com um toque leve de chorus e reverb — bom para arpejos e dedilhado.",
    params: {
      type: 0,
      gain: 1,
      tone: 9,
      reverb: 6,
      feedback: 0,
      volume: 95,
      time: 10,
      mix: 0,
      modulation: 2,
      cabinet: 3,
      irSection: 1,
      delaySection: 0,
      toneSection: 1,
    },
  },
  {
    id: "crunch-classico",
    name: "Crunch clássico",
    description: "Overdrive suave com um pingo de delay, ótimo para riffs de rock e bases com corpo.",
    params: {
      type: 2,
      gain: 3,
      tone: 8,
      reverb: 3,
      feedback: 20,
      volume: 100,
      time: 8,
      mix: 15,
      modulation: 8,
      cabinet: 4,
      irSection: 1,
      delaySection: 1,
      toneSection: 1,
    },
  },
  {
    id: "blues-quente",
    name: "Blues quente",
    description: "Overdrive mais encorpado com reverb e delay discretos — pensado para solos expressivos.",
    params: {
      type: 3,
      gain: 4,
      tone: 7,
      reverb: 5,
      feedback: 30,
      volume: 100,
      time: 12,
      mix: 20,
      modulation: 1,
      cabinet: 4,
      irSection: 1,
      delaySection: 1,
      toneSection: 1,
    },
  },
  {
    id: "metal-moderno",
    name: "Metal moderno",
    description: "Distorção pesada e gain no máximo, com pouco reverb/delay para manter o som direto e agressivo.",
    params: {
      type: 8,
      gain: 7,
      tone: 11,
      reverb: 2,
      feedback: 10,
      volume: 105,
      time: 6,
      mix: 5,
      modulation: 8,
      cabinet: 6,
      irSection: 1,
      delaySection: 0,
      toneSection: 1,
    },
  },
  {
    id: "ambiente-shoegaze",
    name: "Ambiente / Shoegaze",
    description: "Camadas de chorus, reverb longo e delay com bastante repetição — um som \"lavado\" e espacial.",
    params: {
      type: 1,
      gain: 2,
      tone: 10,
      reverb: 14,
      feedback: 90,
      volume: 90,
      time: 26,
      mix: 70,
      modulation: 5,
      cabinet: 2,
      irSection: 1,
      delaySection: 1,
      toneSection: 1,
    },
  },
  {
    id: "funk-clean-brilhante",
    name: "Funk clean brilhante",
    description: "Som bem limpo, agudo e percussivo, com chorus leve — ideal pra levadas de funk/pop.",
    params: {
      type: 0,
      gain: 0,
      tone: 13,
      reverb: 4,
      feedback: 0,
      volume: 95,
      time: 5,
      mix: 0,
      modulation: 3,
      cabinet: 1,
      irSection: 1,
      delaySection: 0,
      toneSection: 1,
    },
  },
  {
    id: "rock-alternativo",
    name: "Rock alternativo",
    description: "Overdrive médio com delay perceptível — versátil para acordes e melodias de rock/indie.",
    params: {
      type: 4,
      gain: 5,
      tone: 9,
      reverb: 6,
      feedback: 35,
      volume: 102,
      time: 14,
      mix: 25,
      modulation: 8,
      cabinet: 5,
      irSection: 1,
      delaySection: 1,
      toneSection: 1,
    },
  },
  {
    id: "pratica-silenciosa",
    name: "Prática silenciosa",
    description: "Volume bem baixo e som limpo, pensado pra treinar sem incomodar — sem efeitos de tempo.",
    params: {
      type: 0,
      gain: 1,
      tone: 8,
      reverb: 3,
      feedback: 0,
      volume: 40,
      time: 8,
      mix: 0,
      modulation: 8,
      cabinet: 3,
      irSection: 1,
      delaySection: 0,
      toneSection: 1,
    },
  },
];
