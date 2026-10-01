export interface AssembledMidiMessage {
  readonly data: Uint8Array;
  readonly receivedAtMs: number;
}

const isRealtime = (byte: number): boolean => byte >= 0xf8;

/**
 * Remonta mensagens MIDI (principalmente SysEx) que às vezes chegam fatiadas
 * em mais de um evento `onmidimessage`.
 */
export class MidiMessageAssembler {
  readonly #emit: (message: AssembledMidiMessage) => void;
  #buffer: number[] = [];
  #inSysEx = false;

  constructor(emit: (message: AssembledMidiMessage) => void) {
    this.#emit = emit;
  }

  push(chunk: Uint8Array, receivedAtMs: number): void {
    for (const byte of chunk) {
      if (isRealtime(byte)) continue;

      if (this.#inSysEx) {
        this.#buffer.push(byte);
        if (byte === 0xf7) {
          this.#emit({ data: Uint8Array.from(this.#buffer), receivedAtMs });
          this.#buffer = [];
          this.#inSysEx = false;
        }
        continue;
      }

      if (byte === 0xf0) {
        this.#buffer = [byte];
        this.#inSysEx = true;
      }
    }
  }

  reset(): void {
    this.#buffer = [];
    this.#inSysEx = false;
  }
}
