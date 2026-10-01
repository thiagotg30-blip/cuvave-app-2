// Tipagem mínima da Web MIDI API (caso a lib.dom do TS não inclua tudo).
interface MIDIOptions {
  sysex?: boolean;
  software?: boolean;
}

interface MIDIPort extends EventTarget {
  readonly id: string;
  readonly manufacturer?: string;
  readonly name?: string;
  readonly type: "input" | "output";
  readonly version?: string;
  readonly state: "connected" | "disconnected";
  readonly connection: "open" | "closed" | "pending";
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
  onstatechange: ((this: MIDIPort, ev: Event) => void) | null;
}

interface MIDIInput extends MIDIPort {
  onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => void) | null;
}

interface MIDIOutput extends MIDIPort {
  send(data: number[] | Uint8Array, timestamp?: number): void;
}

interface MIDIMessageEvent extends Event {
  readonly data: Uint8Array;
  readonly timeStamp: number;
}

interface MIDIInputMap {
  forEach(callback: (value: MIDIInput, key: string) => void): void;
  values(): IterableIterator<MIDIInput>;
  get(id: string): MIDIInput | undefined;
}

interface MIDIOutputMap {
  forEach(callback: (value: MIDIOutput, key: string) => void): void;
  values(): IterableIterator<MIDIOutput>;
  get(id: string): MIDIOutput | undefined;
}

interface MIDIAccess extends EventTarget {
  readonly inputs: MIDIInputMap;
  readonly outputs: MIDIOutputMap;
  readonly sysexEnabled: boolean;
  onstatechange: ((this: MIDIAccess, ev: Event) => void) | null;
}

interface Navigator {
  requestMIDIAccess?(options?: MIDIOptions): Promise<MIDIAccess>;
}
