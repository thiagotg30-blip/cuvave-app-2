// Protocolo SysEx do CUBE Baby (M-VAVE/CUVAVE), feito a partir de engenharia reversa
// comunitária publicada sob MIT/GPL:
//  - https://github.com/MrGariZack/cubecontrol (MIT)
//  - https://github.com/pferreir/cuvave-midi (GPL-3.0, só consultado como referência)
// Adaptado/condensado para este app. Não oficial, não afiliado à M-VAVE/CUVAVE.

export function encodeSevenBit(source: Uint8Array): Uint8Array {
  const destination: number[] = [];
  let bitCount = 0;
  let accumulator = 0;

  for (const byte of source) {
    accumulator = (accumulator | (byte << (bitCount & 0x1f))) >>> 0;
    bitCount += 1;

    while (true) {
      destination.push(accumulator & 0x7f);
      accumulator >>>= 7;
      if (bitCount < 7) break;
      bitCount -= 7;
    }
  }

  if (accumulator > 0) destination.push(accumulator & 0x7f);

  const paddedLength = Math.ceil((source.length * 8) / 7);
  while (destination.length < paddedLength) destination.push(0);

  return Uint8Array.from(destination);
}

export function decodeSevenBit(source: Uint8Array): Uint8Array {
  const destination: number[] = [];
  let bitCount = 0;
  let lastValue = 0;

  for (const byte of source) {
    const mask = bitCount === 0 ? 0 : 0xffffffff >>> (32 - bitCount);
    const accumulator = byte & mask;
    if (bitCount > 0) {
      destination.push(((lastValue & 0x7f) | (accumulator << (8 - bitCount))) & 0xff);
    }
    lastValue = byte >>> bitCount;
    bitCount = (bitCount + 1) % 8;
  }

  if (lastValue > 0) destination.push(lastValue);
  return Uint8Array.from(destination);
}
