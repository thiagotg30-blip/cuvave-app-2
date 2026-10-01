import { calculateChecksum } from "./decoder";
import { encodeSevenBit } from "./sevenBit";

const IDENTITY_MESSAGE_TYPE = 0x11;
const ERASE_MESSAGE_TYPE = 0x21;
const MEMORY_WRITE_MESSAGE_TYPE = 0x22;
const MEMORY_READ_MESSAGE_TYPE = 0x23;

function writeUint24LE(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff);
}

function writeUint32LE(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff);
}

function encodeEnvelope(messageType: number, content: Uint8Array): Uint8Array {
  const clearPayload = Uint8Array.of(
    0x00,
    0x59,
    messageType,
    ...writeUint24LE(content.length),
    ...content,
    calculateChecksum(content),
  );
  const encoded = encodeSevenBit(clearPayload);
  return Uint8Array.of(0xf0, ...encoded, 0xf7);
}

export function encodeIdentityRequest(): Uint8Array {
  return encodeEnvelope(IDENTITY_MESSAGE_TYPE, new Uint8Array());
}

export function encodeMemoryReadRequest(memory: number, address: number, length: number): Uint8Array {
  const content = Uint8Array.of(memory, ...writeUint32LE(address), ...writeUint24LE(length));
  return encodeEnvelope(MEMORY_READ_MESSAGE_TYPE, content);
}

export function encodeMemoryWriteRequest(memory: number, address: number, data: Uint8Array): Uint8Array {
  const content = Uint8Array.of(memory, ...writeUint32LE(address), ...writeUint24LE(data.length), ...data);
  return encodeEnvelope(MEMORY_WRITE_MESSAGE_TYPE, content);
}

/** Apaga um setor de memória flash (usado antes de gravar uma IR na ROM). */
export function encodeEraseRequest(memory: number, address: number): Uint8Array {
  const content = Uint8Array.of(memory, ...writeUint32LE(address));
  return encodeEnvelope(ERASE_MESSAGE_TYPE, content);
}

/** Constantes de IR (impulse response) confirmadas pela engenharia reversa comunitária. */
export const IR_LIVE_MEMORY = 0x04;
export const IR_LIVE_DATA_ADDRESS = 0x0000_0768;
export const IR_LIVE_PAYLOAD_LENGTH = 2052;

export const IR_ROM_MEMORY = 0x00;
export const IR_ROM_CHUNK_SIZE = 128;
export const IR_ROM_VERIFY_CHUNK_SIZE = 113;
export const IR_ROM_PAYLOAD_LENGTH = 2056;
export const IR_ROM_SLOT_STRIDE = 0x1000;
export const IR_ROM_SLOT_SIZE = IR_ROM_SLOT_STRIDE;
export const IR_ROM_FACTORY_BASE = 0x0006_9000;
export const IR_ROM_SLOT_COUNT = 8;

/** Expande uma imagem de 2056 bytes para um setor ROM completo de 4096 bytes. */
export function expandIrRomSector(payload: Uint8Array): Uint8Array {
  if (payload.length === IR_ROM_SLOT_SIZE) return payload.slice();
  if (payload.length !== IR_ROM_PAYLOAD_LENGTH) {
    throw new Error(`IR ROM payload must be ${IR_ROM_PAYLOAD_LENGTH} or ${IR_ROM_SLOT_SIZE} bytes`);
  }
  const sector = new Uint8Array(IR_ROM_SLOT_SIZE);
  sector.set(payload, 0);
  return sector;
}

/** Endereço do slot de IR na ROM de fábrica (0..7). */
export function irRomSlotAddress(slotIndex: number): number {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= IR_ROM_SLOT_COUNT) {
    throw new Error(`IR ROM slotIndex must be an integer 0..${IR_ROM_SLOT_COUNT - 1}`);
  }
  return IR_ROM_FACTORY_BASE + slotIndex * IR_ROM_SLOT_STRIDE;
}

/** Mapeia o parâmetro Cabinet (0..8) pro índice do slot de ROM (1..8 → slot-1; 0 → nenhum). */
export function cabinetToRomSlot(cabinet: number): number | null {
  if (!Number.isInteger(cabinet) || cabinet < 0 || cabinet > 8) {
    throw new Error("cabinet must be an integer 0..8");
  }
  if (cabinet === 0) return null;
  return cabinet - 1;
}
