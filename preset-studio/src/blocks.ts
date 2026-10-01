import { LIVE_PARAM_MAX, type LiveParamName } from "./protocol/live";

export type BlockId = "drive" | "delay" | "reverb" | "modulation" | "cabinet" | "output";

export interface KnobDef {
  readonly param: LiveParamName;
  readonly label: string;
  /** Explicação curta (aparece sempre, como legenda). */
  readonly help: string;
  /** Explicação mais longa em linguagem simples, só aparece no modo iniciante. */
  readonly beginnerHelp: string;
  readonly max: number;
}

export interface ToggleDef {
  readonly param: LiveParamName;
  readonly label: string;
  readonly help: string;
  readonly beginnerHelp: string;
}

export interface BlockDef {
  readonly id: BlockId;
  readonly label: string;
  /** O que esse bloco faz no som, em uma frase simples. */
  readonly description: string;
  readonly accent: string;
  readonly knobs: readonly KnobDef[];
  readonly toggle?: ToggleDef;
}

export const BLOCKS: readonly BlockDef[] = [
  {
    id: "drive",
    label: "Drive / Pré-amp",
    description: "É o \"coração\" da sua distorção — escolhe o tipo de amplificador e o quanto ele suja o som.",
    accent: "#ff6b4a",
    knobs: [
      {
        param: "type",
        label: "Tipo de pré-amp",
        help: "Modelo de amplificador/overdrive",
        beginnerHelp: "Escolha entre 9 \"personalidades\" de amplificador, de limpo (Clean) até bem distorcido.",
        max: LIVE_PARAM_MAX.type,
      },
      {
        param: "gain",
        label: "Gain",
        help: "Quantidade de distorção/ganho",
        beginnerHelp: "Quanto mais alto, mais \"sujo\" e saturado fica o som. Baixo = limpo, alto = distorcido/metal.",
        max: LIVE_PARAM_MAX.gain,
      },
      {
        param: "tone",
        label: "Tom",
        help: "Equalização do pré-amp",
        beginnerHelp: "Controla o brilho. Baixo = som mais grave/encorpado, alto = som mais agudo/brilhante.",
        max: LIVE_PARAM_MAX.tone,
      },
    ],
    toggle: {
      param: "toneSection",
      label: "Bloco de tom ativo",
      help: "Liga/desliga o estágio de tom",
      beginnerHelp: "Desligado, o knob \"Tom\" acima deixa de fazer efeito — o som sai sem esse ajuste de brilho.",
    },
  },
  {
    id: "delay",
    label: "Delay",
    description: "Cria ecos repetidos do que você toca, tipo um \"eco de estúdio\".",
    accent: "#4a9eff",
    knobs: [
      {
        param: "time",
        label: "Tempo",
        help: "Tempo de repetição do eco",
        beginnerHelp: "Quanto maior, mais espaçados ficam os ecos (mais \"largo\" no tempo).",
        max: LIVE_PARAM_MAX.time,
      },
      {
        param: "feedback",
        label: "Feedback",
        help: "Quantidade de repetições",
        beginnerHelp: "Controla quantas vezes o eco repete antes de sumir. Alto = ecos que não param de repetir.",
        max: LIVE_PARAM_MAX.feedback,
      },
      {
        param: "mix",
        label: "Mix",
        help: "Equilíbrio entre som seco e com delay",
        beginnerHelp: "Em 0 você só ouve o som direto da guitarra; quanto mais alto, mais presente fica o eco.",
        max: LIVE_PARAM_MAX.mix,
      },
    ],
    toggle: {
      param: "delaySection",
      label: "Delay ativo",
      help: "Liga/desliga o bloco de delay",
      beginnerHelp: "Desligado, nenhum eco é adicionado, mesmo que os knobs acima estejam ajustados.",
    },
  },
  {
    id: "reverb",
    label: "Reverb",
    description: "Simula o som do ambiente (sala, igreja, estúdio) — dá sensação de espaço.",
    accent: "#38c488",
    knobs: [
      {
        param: "reverb",
        label: "Quantidade",
        help: "Intensidade do reverb",
        beginnerHelp: "Baixo = quase sem efeito (seco); alto = soa como tocando num salão grande, mais \"molhado\".",
        max: LIVE_PARAM_MAX.reverb,
      },
    ],
  },
  {
    id: "modulation",
    label: "Modulação",
    description: "Dá movimento ao som: chorus deixa mais \"encorpado\", phaser cria um efeito giratório.",
    accent: "#c374ff",
    knobs: [
      {
        param: "modulation",
        label: "Chorus / Phaser",
        help: "0–6 chorus · 7–8 desligado · 9–15 phaser",
        beginnerHelp:
          "De 0 a 6 você tem Chorus (engrossa o som, parece duas guitarras tocando juntas). 7 e 8 desligam o efeito. De 9 a 15 é Phaser (um efeito de \"giro\"/varredura).",
        max: LIVE_PARAM_MAX.modulation,
      },
    ],
  },
  {
    id: "cabinet",
    label: "Gabinete (IR)",
    description: "Simula a caixa de som/amplificador que estaria captando seu sinal — muda o \"timbre\" final.",
    accent: "#f2b84b",
    knobs: [
      {
        param: "cabinet",
        label: "Cabinet / IR",
        help: "Qual das 8 respostas de impulso usar",
        beginnerHelp: "Cada número é uma caixa/gabinete diferente gravado por microfone. 0 desliga essa simulação.",
        max: LIVE_PARAM_MAX.cabinet,
      },
    ],
    toggle: {
      param: "irSection",
      label: "IR ativa",
      help: "Liga/desliga a simulação de gabinete",
      beginnerHelp: "Desligado, o som sai \"cru\", sem passar pela simulação de caixa — geralmente fica mais fino/áspero.",
    },
  },
  {
    id: "output",
    label: "Saída",
    description: "O volume final que sai do pedal pro amplificador ou pra interface de áudio.",
    accent: "#9aa4b2",
    knobs: [
      {
        param: "volume",
        label: "Volume",
        help: "Volume final do preset",
        beginnerHelp: "Sobe ou desce o volume geral desse preset. Útil pra igualar o volume entre os presets A, B e C.",
        max: LIVE_PARAM_MAX.volume,
      },
    ],
  },
];
