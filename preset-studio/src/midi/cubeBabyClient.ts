import { decodeCubeBabyMessage } from "../protocol/decoder";
import { encodeIdentityRequest, encodeMemoryReadRequest, encodeMemoryWriteRequest } from "../protocol/requests";
import {
  BANK_ADDRESS,
  BANK_MEMORY,
  LIVE_PARAM_MEMORY,
  liveParamAddress,
  type LiveParamName,
} from "../protocol/live";
import { decodePresetBank, PRESET_BANK_BYTE_LENGTH, type CubeBabyPresetBank, type PresetSlotId } from "../protocol/preset";
import { MidiMessageAssembler } from "./assembler";
import type { CubeBabyMessage } from "../protocol/types";

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

  async readMemory(memory: number, address: number, length: number, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Uint8Array> {
    return this.#exclusive(async () => {
      await this.#handshake();
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

  async writeMemory(memory: number, address: number, data: Uint8Array, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> {
    return this.#exclusive(async () => {
      await this.#handshake();
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
}
