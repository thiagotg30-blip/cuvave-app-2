import { IR_LIVE_PAYLOAD_LENGTH, IR_ROM_PAYLOAD_LENGTH, IR_ROM_SLOT_SIZE } from "./requests";

export const IR_LIVE_SAMPLE_COUNT = 512;
export const IR_ROM_AUDIO_SAMPLE_COUNT = 1022;
export const IR_ROM_PRIMARY_SAMPLE_COUNT = IR_LIVE_SAMPLE_COUNT;
export const IR_ROM_HEADER_BYTES = 8;
export const IR_TARGET_SAMPLE_RATE = 48_000;

export const IR_ROM_PRESENCE_FACTORY = Uint8Array.of(0x01, 0x00, 0x00, 0x00);
export const IR_ROM_PRESENCE_UPLOAD = Uint8Array.of(0x00, 0x00, 0x00, 0x00);

export type IrRomPresenceStyle = "factory" | "upload";

export interface BuildIrRomSectorOptions {
  readonly samples: Float32Array;
  readonly volume?: number;
  readonly presence?: IrRomPresenceStyle;
}

function writeFloat32LE(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer, target.byteOffset, target.byteLength).setFloat32(offset, value, true);
}

function readFloat32LE(source: Uint8Array, offset: number): number {
  return new DataView(source.buffer, source.byteOffset, source.byteLength).getFloat32(offset, true);
}

export function normalizeIrSamples(samples: Float32Array, count: number): Float32Array {
  if (!Number.isInteger(count) || count <= 0) throw new Error("sample count must be a positive integer");
  if (samples.length === count) return samples.slice();
  const out = new Float32Array(count);
  out.set(samples.subarray(0, Math.min(samples.length, count)));
  return out;
}

/** Reamostra linearmente pra 48kHz e corta pros primeiros 512 samples (janela usada pelo pedal). */
export function prepareIrSamples(
  samples: Float32Array,
  sourceSampleRate: number,
  targetCount: number = IR_LIVE_SAMPLE_COUNT,
): Float32Array {
  if (!Number.isFinite(sourceSampleRate) || sourceSampleRate <= 0) {
    throw new Error("sourceSampleRate must be a positive finite number");
  }
  if (samples.length === 0) throw new Error("O arquivo de áudio não tem amostras.");

  let mono = samples;
  if (sourceSampleRate !== IR_TARGET_SAMPLE_RATE) {
    const ratio = sourceSampleRate / IR_TARGET_SAMPLE_RATE;
    const outLength = Math.max(1, Math.round(samples.length / ratio));
    const resampled = new Float32Array(outLength);
    for (let i = 0; i < outLength; i += 1) {
      const src = i * ratio;
      const i0 = Math.floor(src);
      const i1 = Math.min(i0 + 1, samples.length - 1);
      const frac = src - i0;
      const s0 = samples[i0] ?? 0;
      const s1 = samples[i1] ?? 0;
      resampled[i] = s0 + (s1 - s0) * frac;
    }
    mono = resampled;
  }
  return normalizeIrSamples(mono, targetCount);
}

/** Monta um setor de ROM de 4096 bytes (cabeçalho + amostras + zero padding). */
export function buildIrRomSector(options: BuildIrRomSectorOptions): Uint8Array {
  const volume = options.volume ?? 0.5;
  if (!Number.isFinite(volume)) throw new Error("volume must be a finite number");
  const presence = options.presence === "factory" ? IR_ROM_PRESENCE_FACTORY : IR_ROM_PRESENCE_UPLOAD;
  const samples = normalizeIrSamples(options.samples, IR_ROM_PRIMARY_SAMPLE_COUNT);
  const sector = new Uint8Array(IR_ROM_SLOT_SIZE);
  sector.set(presence, 0);
  writeFloat32LE(sector, 4, volume);
  const view = new DataView(sector.buffer, sector.byteOffset, sector.byteLength);
  for (let i = 0; i < samples.length; i += 1) view.setFloat32(IR_ROM_HEADER_BYTES + i * 4, samples[i] ?? 0, true);
  return sector;
}

export interface BuildIrLivePayloadOptions {
  readonly samples: Float32Array;
  readonly distance?: number;
}

export function buildIrLivePayload(options: BuildIrLivePayloadOptions): Uint8Array {
  const distance = options.distance ?? 0.5;
  const samples = normalizeIrSamples(options.samples, IR_LIVE_SAMPLE_COUNT);
  const payload = new Uint8Array(IR_LIVE_PAYLOAD_LENGTH);
  writeFloat32LE(payload, 0, distance);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  for (let i = 0; i < samples.length; i += 1) view.setFloat32(4 + i * 4, samples[i] ?? 0, true);
  return payload;
}

export function irRomSectorToLivePayload(sector: Uint8Array): Uint8Array {
  if (sector.length !== IR_ROM_SLOT_SIZE) throw new Error(`ROM sector must be ${IR_ROM_SLOT_SIZE} bytes`);
  const distance = readFloat32LE(sector, 4);
  const samples = new Float32Array(IR_LIVE_SAMPLE_COUNT);
  const view = new DataView(sector.buffer, sector.byteOffset, sector.byteLength);
  for (let i = 0; i < IR_LIVE_SAMPLE_COUNT; i += 1) samples[i] = view.getFloat32(IR_ROM_HEADER_BYTES + i * 4, true);
  return buildIrLivePayload({ samples, distance });
}

export function irRomSectorToUploadPayload(sector: Uint8Array): Uint8Array {
  if (sector.length !== IR_ROM_SLOT_SIZE) throw new Error(`ROM sector must be ${IR_ROM_SLOT_SIZE} bytes`);
  return sector.slice(0, IR_ROM_PAYLOAD_LENGTH);
}

export interface ParsedIrRomSector {
  readonly presence: IrRomPresenceStyle | "other";
  readonly volume: number;
  readonly samples: Float32Array;
  readonly sanitizedSampleCount: number;
}

function detectPresence(header: Uint8Array): IrRomPresenceStyle | "other" {
  if (header[0] === IR_ROM_PRESENCE_FACTORY[0] && header[1] === 0 && header[2] === 0 && header[3] === 0 && header[0] === 1) {
    return "factory";
  }
  if (header[0] === 0 && header[1] === 0 && header[2] === 0 && header[3] === 0) return "upload";
  return "other";
}

export function parseIrRomSector(sector: Uint8Array): ParsedIrRomSector {
  if (sector.length !== IR_ROM_SLOT_SIZE) throw new Error(`ROM sector must be ${IR_ROM_SLOT_SIZE} bytes`);
  const volumeRaw = readFloat32LE(sector, 4);
  const volume = Number.isFinite(volumeRaw) ? volumeRaw : 0.5;
  const samples = new Float32Array(IR_ROM_PRIMARY_SAMPLE_COUNT);
  const view = new DataView(sector.buffer, sector.byteOffset, sector.byteLength);
  let sanitizedSampleCount = 0;
  for (let i = 0; i < IR_ROM_PRIMARY_SAMPLE_COUNT; i += 1) {
    const sample = view.getFloat32(IR_ROM_HEADER_BYTES + i * 4, true);
    if (Number.isFinite(sample)) {
      samples[i] = sample;
    } else {
      samples[i] = 0;
      sanitizedSampleCount += 1;
    }
  }
  return { presence: detectPresence(sector.subarray(0, 4)), volume, samples, sanitizedSampleCount };
}

export interface DecodedWav {
  readonly sampleRate: number;
  readonly samples: Float32Array;
  readonly channels: number;
}

function findChunk(view: DataView, id: string, from: number): { offset: number; size: number } {
  let offset = from;
  while (offset + 8 <= view.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const size = view.getUint32(offset + 4, true);
    if (chunkId === id) return { offset: offset + 8, size };
    offset += 8 + size + (size % 2);
  }
  throw new Error(`O WAV não tem o bloco "${id}" esperado.`);
}

/** Decodifica um WAV PCM/float pra mono float32 (-1..1). Aceita 16/24/32-bit PCM e float 32-bit. */
export function decodeWavToMonoFloat32(bytes: Uint8Array): DecodedWav {
  if (bytes.length < 44) throw new Error("Arquivo WAV inválido ou muito pequeno.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (riff !== "RIFF" || wave !== "WAVE") throw new Error("Esse arquivo não é um WAV (RIFF/WAVE) válido.");

  const fmt = findChunk(view, "fmt ", 12);
  const audioFormat = view.getUint16(fmt.offset, true);
  const channels = view.getUint16(fmt.offset + 2, true);
  const sampleRate = view.getUint32(fmt.offset + 4, true);
  const bitsPerSample = view.getUint16(fmt.offset + 14, true);
  if (channels < 1) throw new Error("WAV sem canais de áudio.");

  const data = findChunk(view, "data", 12);
  const frameSize = (bitsPerSample / 8) * channels;
  if (!Number.isInteger(frameSize) || frameSize <= 0) throw new Error("Formato de WAV não suportado.");
  const frameCount = Math.floor(data.size / frameSize);
  const mono = new Float32Array(frameCount);
  let o = data.offset;

  for (let i = 0; i < frameCount; i += 1) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch += 1) {
      if (audioFormat === 3 && bitsPerSample === 32) {
        sum += view.getFloat32(o, true);
        o += 4;
      } else if (audioFormat === 1 && bitsPerSample === 16) {
        sum += view.getInt16(o, true) / 32768;
        o += 2;
      } else if (audioFormat === 1 && bitsPerSample === 24) {
        const b0 = view.getUint8(o);
        const b1 = view.getUint8(o + 1);
        const b2 = view.getUint8(o + 2);
        o += 3;
        let sample = (b2 << 16) | (b1 << 8) | b0;
        if (sample & 0x800000) sample |= ~0xffffff;
        sum += sample / 8388608;
      } else if (audioFormat === 1 && bitsPerSample === 32) {
        sum += view.getInt32(o, true) / 2147483648;
        o += 4;
      } else {
        throw new Error(`Formato de WAV não suportado (audioFormat=${audioFormat}, bits=${bitsPerSample}). Use PCM 16/24/32-bit ou float 32-bit.`);
      }
    }
    mono[i] = sum / channels;
  }

  return { sampleRate, samples: mono, channels };
}

/** Codifica um WAV mono PCM16 simples (usado pra exportar uma IR lida do pedal). */
export function encodeMonoPcm16Wav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }
  return bytes;
}
