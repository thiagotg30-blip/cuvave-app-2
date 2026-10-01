import type { LiveParamName } from "../protocol/live";

export type PresetParams = Record<LiveParamName, number>;

export interface LibraryPreset {
  readonly id: string;
  readonly name: string;
  readonly notes?: string;
  readonly params: PresetParams;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Formato de arquivo único (um preset por arquivo .json), fácil de compartilhar. */
export const SINGLE_PRESET_FORMAT = "cuvave-preset-studio-preset-v1";

export interface SinglePresetFile {
  readonly format: typeof SINGLE_PRESET_FORMAT;
  readonly name: string;
  readonly notes?: string;
  readonly params: PresetParams;
  readonly exportedAt: string;
}

/** Formato de arquivo com vários presets (biblioteca inteira), para backup. */
export const LIBRARY_FILE_FORMAT = "cuvave-preset-studio-library-v1";

export interface LibraryFile {
  readonly format: typeof LIBRARY_FILE_FORMAT;
  readonly exportedAt: string;
  readonly presets: readonly SinglePresetFile[];
}
