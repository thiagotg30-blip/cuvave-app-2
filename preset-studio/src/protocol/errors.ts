export type CubeBabyDecodeErrorCode = "invalid-markers" | "payload-too-short" | "invalid-magic" | "length-mismatch";

export class CubeBabyDecodeError extends Error {
  readonly code: CubeBabyDecodeErrorCode;

  constructor(message: string, code: CubeBabyDecodeErrorCode) {
    super(message);
    this.name = "CubeBabyDecodeError";
    this.code = code;
  }
}
