import { decodeCubeBabyMessage } from "../protocol/decoder";
import {
  encodeEraseRequest,
  encodeIdentityRequest,
  encodeMemoryReadRequest,
  encodeMemoryWriteRequest,
  cabinetToRomSlot,
  expandIrRomSector,
  irRomSlotAddress,
  IR_ROM_CHUNK_SIZE,
  IR_ROM_MEMORY,
  IR_ROM_PAYLOAD_LENGTH,
  IR_ROM_SLOT_SIZE,
  IR_ROM_VERIFY_CHUNK_SIZE,
} from "../protocol/requests";
import {
  BANK_ADDRESS,
  BANK_MEMORY,
  LIVE_PARAM_MEMORY,
  liveParamAddress,
  type LiveParamName,
} from "../protocol/live";
import { decodePresetBank, PRESET_BANK_BYTE_LENGTH, type CubeBabyPresetBank, type PresetSlotId } from "../protocol/preset";
import { buildIrRomSector, decodeWavToMonoFloat32, prepareIrSamples, parseIrRomSector, encodeMonoPcm16Wav, IR_TARGET_SAMPLE_RATE } from "../protocol/ir";
import { MidiMessageAssembler } from "./assembler";
import type { CubeBabyMessage } from "../protocol/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface IrUploadProgress {
  readonly step: "apagando" | "gravando" | "verificando" | "selecionando-cabinet" | "concluido";
  readonly pct: number;
}

export interface IrUploadResult {
  readonly slotIndex: number;
  readonly cabinet: number;
  readonly verified: boolean;
}

export interface MidiPortInfo {
  readonly id: string;
  readonly name: string;
  readonly manufacturer?: string;
}

export class CubeBabyNotSupportedError extends Error {
  constructor() {
    super("Este navegador não suporta a Web MIDI API. Use o Chrome ou o Edge no computador.");
    this.name = "CubeBabyNotSupportedError";
  }
}

export class CubeBabyTimeoutError extends Error {
  constructor(message = "O pedal não respondeu a tempo. Verifique o cabo USB e tente de novo.") {
    super(message);
    this.name = "CubeBabyTimeoutError";
  }
}

type PendingMatch = {
  readonly match: (message: CubeBabyMessage) => boolean;
  readonly resolve: (message: CubeBabyMessage) => void;
};

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Conexão USB/MIDI (SysEx) direta com o CUBE Baby, usando a Web MIDI API do
 * navegador. Protocolo baseado na engenharia reversa comunitária (MIT/GPL),
 * não é um app oficial da M-VAVE/CUVAVE.
 */
export class CubeBabyClient {
  #access: MIDIAccess | undefined;
  #input: MIDIInput | undefined;
  #output: MIDIOutput | undefined;
  #assembler = new MidiMessageAssembler((msg) => this.#onMessage(msg.data));
  #pending: PendingMatch[] = [];
  #busy: Promise<unknown> = Promise.resolve();

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
  }

  async listPorts(): Promise<{ inputs: MidiPortInfo[]; outputs: MidiPortInfo[] }> {
    if (!CubeBabyClient.isSupported()) throw new CubeBabyNotSupportedError();
    const access = await this.#ensureAccess();
    const inputs: MidiPortInfo[] = [];
    access.inputs.forEach((port) =>
      inputs.push({ id: port.id, name: port.name ?? port.id, manufacturer: port.manufacturer ?? undefined }),
    );
    const outputs: MidiPortInfo[] = [];
    access.outputs.forEach((port) =>
      outputs.push({ id: port.id, name: port.name ?? port.id, manufacturer: port.manufacturer ?? undefined }),
    );
    return { inputs, outputs };
  }

  async #ensureAccess(): Promise<MIDIAccess> {
    if (this.#access) return this.#access;
    if (!navigator.requestMIDIAccess) throw new CubeBabyNotSupportedError();
    this.#access = await navigator.requestMIDIAccess({ sysex: true });
    return this.#access;
  }

  get connected(): boolean {
    return this.#input !== undefined && this.#output !== undefined;
  }

  async connect(inputId: string, outputId: string): Promise<void> {
    const access = await this.#ensureAccess();
    const input = access.inputs.get(inputId);
    const output = access.outputs.get(outputId);
    if (!input || !output) throw new Error("Porta MIDI não encontrada. Reconecte o pedal e tente de novo.");
    await input.open();
    await output.open();
    input.onmidimessage = (event) => this.#assembler.push(event.data ?? new Uint8Array(), Date.now());
    this.#input = input;
    this.#output = output;
  }

  async disconnect(): Promise<void> {
    if (this.#input) this.#input.onmidimessage = null;
    this.#input = undefined;
    this.#output = undefined;
  }

  #onMessage(data: Uint8Array): void {
    let message: CubeBabyMessage;
    try {
      message = decodeCubeBabyMessage(data);
    } catch {
      return;
    }
    const match = this.#pending.find((p) => p.match(message));
    if (match) {
      this.#pending = this.#pending.filter((p) => p !== match);
      match.resolve(message);
    }
  }

  #send(sysex: Uint8Array): void {
    if (!this.#output) throw new Error("Pedal não conectado.");
    this.#output.send(sysex);
  }

  #waitFor(match: (message: CubeBabyMessage) => boolean, timeoutMs: number): Promise<CubeBabyMessage> {
    return new Promise((resolve, reject) => {
      const entry: PendingMatch = { match, resolve: (m) => { clearTimeout(timer); resolve(m); } };
      const timer = setTimeout(() => {
        this.#pending = this.#pending.filter((p) => p !== entry);
        reject(new CubeBabyTimeoutError());
      }, timeoutMs);
      this.#pending.push(entry);
    });
  }

  /** Serializa chamadas: o pedal não lida bem com pedidos concorrentes. */
  #exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.#busy.then(fn, fn);
    this.#busy = run.catch(() => undefined);
    return run;
  }

  async identify(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
    return this.#exclusive(async () => {
      const pending = this.#waitFor((m) => m.kind === "identity-response", timeoutMs);
      this.#send(encodeIdentityRequest());
      const message = await pending;
      if (message.kind !== "identity-response") throw new Error("resposta inesperada");
      return message.name;
    });
  }

  async #handshake(): Promise<void> {
    this.#send(encodeIdentityRequest());
    await new Promise((r) => setTimeout(r, 80));
  }

  async readMemory(memory: number, address: number, length: number, timeoutMs = DEFAULT_TIMEOUT_MS, handshake = true): Promise<Uint8Array> {
    return this.#exclusive(async () => {
      if (handshake) await this.#handshake();
      const pending = this.#waitFor(
        (m) => m.kind === "memory-read-response" && m.memory === memory && m.address === address && m.length === length,
        timeoutMs,
      );
      this.#send(encodeMemoryReadRequest(memory, address, length));
      const message = await pending;
      if (message.kind !== "memory-read-response") throw new Error("resposta inesperada");
      return message.data;
    });
  }

  async writeMemory(memory: number, address: number, data: Uint8Array, timeoutMs = DEFAULT_TIMEOUT_MS, handshake = true): Promise<boolean> {
    return this.#exclusive(async () => {
      if (handshake) await this.#handshake();
      const pending = this.#waitFor((m) => m.kind === "ack", timeoutMs);
      this.#send(encodeMemoryWriteRequest(memory, address, data));
      const message = await pending;
      if (message.kind !== "ack") throw new Error("resposta inesperada");
      return message.accepted;
    });
  }

  /** Lê o banco inteiro de presets (slots A, B e C) de uma vez. */
  async readPresetBank(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<CubeBabyPresetBank> {
    const data = await this.readMemory(BANK_MEMORY, BANK_ADDRESS, PRESET_BANK_BYTE_LENGTH, timeoutMs);
    return decodePresetBank(data);
  }

  /** Escreve um único parâmetro de um slot em tempo real (o pedal já ouve na hora). */
  async writeLiveParam(slot: PresetSlotId, param: LiveParamName, value: number, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> {
    const address = liveParamAddress(param, slot);
    return this.writeMemory(LIVE_PARAM_MEMORY, address, Uint8Array.of(value), timeoutMs);
  }

  async eraseMemory(memory: number, address: number, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> {
    return this.#exclusive(async () => {
      await this.#handshake();
      const pending = this.#waitFor((m) => m.kind === "ack", timeoutMs);
      this.#send(encodeEraseRequest(memory, address));
      const message = await pending;
      if (message.kind !== "ack") throw new Error("resposta inesperada");
      return message.accepted;
    });
  }

  /** Lê um setor inteiro (4096 bytes) de IR da ROM de fábrica, em pedaços pequenos. */
  async readIrRomSector(slotIndex: number, onProgress?: (pct: number) => void): Promise<Uint8Array> {
    const address = irRomSlotAddress(slotIndex);
    const parts: number[] = [];
    let first = true;
    for (let offset = 0; offset < IR_ROM_SLOT_SIZE; offset += IR_ROM_VERIFY_CHUNK_SIZE) {
      const length = Math.min(IR_ROM_VERIFY_CHUNK_SIZE, IR_ROM_SLOT_SIZE - offset);
      // eslint-disable-next-line no-await-in-loop
      const chunk = await this.readMemory(IR_ROM_MEMORY, address + offset, length, DEFAULT_TIMEOUT_MS, first);
      first = false;
      parts.push(...chunk);
      onProgress?.(Math.round(((offset + length) / IR_ROM_SLOT_SIZE) * 100));
      // eslint-disable-next-line no-await-in-loop
      await sleep(30);
    }
    return Uint8Array.from(parts);
  }

  /** Exporta uma IR já gravada no pedal (slot 0..7) como um arquivo .wav. */
  async exportIrRomToWav(slotIndex: number, onProgress?: (pct: number) => void): Promise<Uint8Array> {
    const sector = await this.readIrRomSector(slotIndex, onProgress);
    const parsed = parseIrRomSector(sector);
    return encodeMonoPcm16Wav(parsed.samples, IR_TARGET_SAMPLE_RATE);
  }

  /**
   * Grava uma IR (payload de 2056 ou 4096 bytes) num slot da ROM de fábrica (0..7):
   * apaga → grava em blocos → lê de volta pra conferir. Operação mais arriscada que
   * editar um knob — prefira sempre o slot 8 (índice 7, "upload") e faça backup antes.
   */
  async persistIrRom(payload: Uint8Array, slotIndex: number, onProgress?: (p: IrUploadProgress) => void): Promise<boolean> {
    const address = irRomSlotAddress(slotIndex);
    const sector = expandIrRomSector(payload);

    onProgress?.({ step: "apagando", pct: 0 });
    await this.eraseMemory(IR_ROM_MEMORY, address);
    await sleep(250);

    let written = 0;
    for (let offset = 0; offset < sector.length; offset += IR_ROM_CHUNK_SIZE) {
      const chunk = sector.subarray(offset, offset + IR_ROM_CHUNK_SIZE);
      // eslint-disable-next-line no-await-in-loop
      await this.writeMemory(IR_ROM_MEMORY, address + offset, chunk, DEFAULT_TIMEOUT_MS, offset === 0);
      written += chunk.length;
      onProgress?.({ step: "gravando", pct: Math.round((written / sector.length) * 100) });
      // eslint-disable-next-line no-await-in-loop
      await sleep(40);
    }
    await sleep(250);

    onProgress?.({ step: "verificando", pct: 0 });
    const verifyParts: number[] = [];
    for (let offset = 0; offset < sector.length; offset += IR_ROM_VERIFY_CHUNK_SIZE) {
      const length = Math.min(IR_ROM_VERIFY_CHUNK_SIZE, sector.length - offset);
      // eslint-disable-next-line no-await-in-loop
      const read = await this.readMemory(IR_ROM_MEMORY, address + offset, length, DEFAULT_TIMEOUT_MS, offset === 0);
      verifyParts.push(...read);
      onProgress?.({ step: "verificando", pct: Math.round(((offset + length) / sector.length) * 100) });
      // eslint-disable-next-line no-await-in-loop
      await sleep(30);
    }
    const verifiedBytes = Uint8Array.from(verifyParts);
    return verifiedBytes.length === sector.length && verifiedBytes.every((b, i) => b === sector[i]);
  }

  /** Seleciona o Cabinet ativo (0..8) no slot de preset indicado; "belisca" outro valor antes pra forçar recarregar a IR. */
  async selectCabinet(slot: PresetSlotId, cabinet: number, nudge = true): Promise<void> {
    if (nudge) {
      const nudgeValue = cabinet === 1 ? 2 : 1;
      await this.writeLiveParam(slot, "cabinet", nudgeValue);
      await sleep(350);
    }
    await this.writeLiveParam(slot, "cabinet", cabinet);
    await sleep(350);
  }

  /**
   * Fluxo completo: WAV → amostras 48kHz/512 → setor de ROM → grava no slot da ROM →
   * seleciona o Cabinet correspondente no preset atual.
   */
  async loadIrFromWav(
    wavBytes: Uint8Array,
    options: { readonly slotIndex: number; readonly slot: PresetSlotId; readonly volume?: number; readonly onProgress?: (p: IrUploadProgress) => void },
  ): Promise<IrUploadResult> {
    const decoded = decodeWavToMonoFloat32(wavBytes);
    const samples = prepareIrSamples(decoded.samples, decoded.sampleRate);
    const sector = buildIrRomSector({ samples, volume: options.volume ?? 0.5, presence: "upload" });
    const verified = await this.persistIrRom(sector, options.slotIndex, options.onProgress);
    const cabinet = options.slotIndex + 1;
    options.onProgress?.({ step: "selecionando-cabinet", pct: 100 });
    await this.selectCabinet(options.slot, cabinet);
    options.onProgress?.({ step: "concluido", pct: 100 });
    return { slotIndex: options.slotIndex, cabinet, verified };
  }
}

export { cabinetToRomSlot, IR_ROM_PAYLOAD_LENGTH };
