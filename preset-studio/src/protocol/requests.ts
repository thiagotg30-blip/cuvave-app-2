import { calculateChecksum } from "./decoder";
import { encodeSevenBit } from "./sevenBit";

const IDENTITY_MESSAGE_TYPE = 0x11;
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
