# CUBE Baby Preset Studio (não oficial)

Editor web alternativo para o pedal **M-VAVE / CUVAVE CUBE Baby**, feito porque o
`CubeSuite.exe` oficial (que está na raiz deste repositório) não permite importar
um preset a partir de um arquivo e tem uma interface pouco intuitiva.

> ⚠️ **Projeto independente, não afiliado à M-VAVE/CUVAVE.** O protocolo USB usado
> aqui foi reconstruído por engenharia reversa comunitária (ver "Créditos"
> abaixo), não pela fabricante. Use por sua conta e risco: sempre exporte um
> backup do preset atual antes de gravar algo novo no pedal.

## O que ele resolve

- **Importar preset de um arquivo** (`.json`) e gravar direto num slot A/B/C do
  pedal — exatamente o que faltava no app original.
- **Biblioteca de presets** local (funciona mesmo sem o pedal conectado):
  arraste arquivos `.json` para importar, organize, edite e exporte de volta.
- **Edição mais direta**: os parâmetros ficam agrupados por bloco (Drive, Delay,
  Reverb, Modulação, Gabinete/IR, Saída) com os limites reais de cada um, em vez
  de uma tela só de knobs soltos.
- Compatível com arquivos de "banco" exportados pelo projeto comunitário
  [CubeControl/ToneHub](https://github.com/MrGariZack/cubecontrol-app) (mesmo
  hardware), então presets trocados em grupos/Discord tendem a importar direto.

## Como usar

1. Rode `npm install` e `npm run dev` (ou use o preview que já está no ar neste
   workspace) e abra a página **no Google Chrome ou Edge** — são os únicos
   navegadores com suporte a Web MIDI com SysEx.
2. Plugue o CUBE Baby via USB **no mesmo computador** onde está o navegador.
3. Aba **Pedal**: escolha a porta de entrada/saída MIDI (o app tenta adivinhar)
   e clique em **Conectar**. Clique em **Ler do pedal** para trazer os 3 presets
   salvos para a tela.
4. Para importar um preset de arquivo: **Importar arquivo...** → escolha o
   `.json` → ele cai no editor do slot selecionado → se quiser, confirme a
   gravação direto no pedal.
5. Aba **Biblioteca**: arraste quantos arquivos `.json` quiser, edite, exporte
   de volta ou aplique em qualquer slot quando o pedal estiver conectado.

Tem um preset de exemplo em `examples/preset-exemplo-metal.json` só para testar
a importação sem precisar de um arquivo real.

## Formato de arquivo

Um preset exportado por este app se parece com isto (os valores batem com os
knobs reais do Cube Baby: Type 0–8, Gain 0–7, Tone 0–15, Reverb 0–15, Feedback
0–127, Volume 0–127, Time 0–31, Mix 0–118, Modulation 0–15, Cabinet 0–8, e os
três `...Section` são 0/1 de liga-desliga):

```json
{
  "format": "cuvave-preset-studio-preset-v1",
  "name": "Minha base crunch",
  "params": { "type": 2, "gain": 5, "tone": 8, "reverb": 4, "feedback": 10,
              "volume": 100, "time": 12, "mix": 20, "modulation": 8,
              "cabinet": 3, "irSection": 1, "delaySection": 1, "toneSection": 1 },
  "exportedAt": "2026-10-01T00:00:00.000Z"
}
```

O importador também aceita qualquer JSON "solto" que tenha essas mesmas chaves
numéricas, e o formato `tonehub-cube-baby-bank-v1` do CubeControl.

## Upload e exportação de IR (gabinete)

A seção **Gabinetes / IR** (dentro da aba Pedal) permite:

- Importar um arquivo `.wav` (mono ou estéreo, PCM 16/24/32-bit ou float
  32-bit) direto num dos 8 slots de Cabinet do pedal — convertido
  automaticamente para 48 kHz e para o formato interno que o CUBE Baby espera.
- Exportar a IR que já está gravada num slot de volta como `.wav`, pra backup
  ou pra reaproveitar em outro lugar.

Essa é uma operação de **apagar + regravar um setor de memória flash**, mais
arriscada que só mexer em knobs — a interface sempre pede confirmação antes,
avisa quando você escolhe um dos 7 slots de fábrica (em vez do slot 8,
recomendado para upload) e mostra uma barra de progresso. Veja
[`TESTE-COM-PEDAL.md`](TESTE-COM-PEDAL.md) para um roteiro de teste completo.

## Limitações conhecidas

- Testado contra documentação e capturas reais de outros projetos
  open source, mas **não contra um pedal físico neste ambiente** (o sandbox não
  tem porta USB). Teste com cuidado e compare com o CubeSuite antes de confiar
  100% nos valores — siga o roteiro em `TESTE-COM-PEDAL.md`.
- Cobre os 13 parâmetros "ao vivo" de cada preset (pré-amp, delay, reverb,
  modulação, cabinet/IR, volume) e upload/exportação de IR — não cobre
  atualização de firmware, que é uma operação ainda mais arriscada e não foi
  implementada de propósito.
- Web MIDI com SysEx só funciona em navegadores baseados em Chromium
  (Chrome, Edge, Brave...). Firefox e Safari não suportam.

## Créditos / protocolo

O protocolo SysEx (envelope, checksum, codificação de 7 bits, mapa de memória
dos 3 presets) foi adaptado a partir de projetos abertos que fizeram a
engenharia reversa validando contra o hardware real e o próprio CubeSuite:

- [`cuvave-midi`](https://github.com/pferreir/cuvave-midi) (GPL-3.0) — mapa de
  memória original.
- [`cubecontrol` / `cubecontrol-app`](https://github.com/MrGariZack/cubecontrol)
  (MIT) — protocolo completo, capturas reais de tráfego USB e definição dos
  blocos/parâmetros usados neste app.
