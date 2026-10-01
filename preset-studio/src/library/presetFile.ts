import { LIVE_PARAM_NAMES, LIVE_PARAM_MAX, type LiveParamName } from "../protocol/live";
import {
  LIBRARY_FILE_FORMAT,
  SINGLE_PRESET_FORMAT,
  type LibraryFile,
  type LibraryPreset,
  type PresetParams,
  type SinglePresetFile,
} from "./types";

function clampParams(raw: Partial<Record<string, number>>): PresetParams {
  const params = {} as PresetParams;
  for (const name of LIVE_PARAM_NAMES) {
    const value = raw[name];
    const max = LIVE_PARAM_MAX[name];
    params[name] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0;
  }
  return params;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

interface ParsedImport {
  readonly presets: SinglePresetFile[];
  readonly warnings: string[];
}

/**
 * Tenta importar um arquivo de preset de várias origens possíveis:
 *  - nosso próprio formato (um preset ou uma biblioteca inteira)
 *  - formato "tonehub-cube-baby-bank-v1" exportado pelo CubeControl (compatível,
 *    mesmo hardware) — cada slot A/B/C vira um preset separado
 *  - um objeto "solto" com os nomes dos parâmetros (type, gain, tone, ...)
 */
export function parseImportedPresetFile(raw: unknown): ParsedImport {
  const warnings: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    throw new Error("O arquivo não é um JSON válido de preset.");
  }
  const obj = raw as Record<string, unknown>;

  if (obj.format === SINGLE_PRESET_FORMAT) {
    const name = typeof obj.name === "string" ? obj.name : "Preset importado";
    const notes = typeof obj.notes === "string" ? obj.notes : undefined;
    const params = clampParams((obj.params as Record<string, number>) ?? {});
    return {
      presets: [{ format: SINGLE_PRESET_FORMAT, name, ...(notes ? { notes } : {}), params, exportedAt: new Date().toISOString() }],
      warnings,
    };
  }

  if (obj.format === LIBRARY_FILE_FORMAT) {
    const list = Array.isArray(obj.presets) ? (obj.presets as Record<string, unknown>[]) : [];
    const presets = list.map((item, index) => {
      const name = typeof item.name === "string" ? item.name : `Preset ${index + 1}`;
      const notes = typeof item.notes === "string" ? item.notes : undefined;
      const params = clampParams((item.params as Record<string, number>) ?? {});
      return { format: SINGLE_PRESET_FORMAT, name, ...(notes ? { notes } : {}), params, exportedAt: new Date().toISOString() } satisfies SinglePresetFile;
    });
    return { presets, warnings };
  }

  if (obj.format === "tonehub-cube-baby-bank-v1") {
    const slots = Array.isArray(obj.slots) ? (obj.slots as Record<string, unknown>[]) : [];
    if (slots.length === 0 && typeof obj.dataHex === "string") {
      warnings.push("Arquivo de banco sem detalhamento por parâmetro; usando apenas os bytes brutos não foi possível decodificar os nomes.");
    }
    const presets = slots.map((slot) => {
      const name = `Importado (slot ${String(slot.slot ?? "?")})`;
      const params = clampParams(slot as Record<string, number>);
      return { format: SINGLE_PRESET_FORMAT, name, params, exportedAt: new Date().toISOString() } satisfies SinglePresetFile;
    });
    if (presets.length > 0) warnings.push("Importado de um arquivo de banco compatível (formato CubeControl/ToneHub).");
    return { presets, warnings };
  }

  // Objeto solto: procura por chaves conhecidas de parâmetro em qualquer lugar do JSON.
  const looksLikeParams = LIVE_PARAM_NAMES.some((name) => typeof obj[name] === "number");
  if (looksLikeParams) {
    const name = typeof obj.name === "string" ? obj.name : "Preset importado";
    const params = clampParams(obj as Record<string, number>);
    warnings.push("Formato não reconhecido oficialmente; os parâmetros foram lidos por nome (type, gain, tone, ...).");
    return { presets: [{ format: SINGLE_PRESET_FORMAT, name, params, exportedAt: new Date().toISOString() }], warnings };
  }

  throw new Error(
    "Não reconheci esse arquivo como um preset do CUBE Baby. Formatos aceitos: preset único, biblioteca exportada por este app, ou banco do CubeControl/ToneHub.",
  );
}

export function presetToFile(preset: LibraryPreset): SinglePresetFile {
  return {
    format: SINGLE_PRESET_FORMAT,
    name: preset.name,
    ...(preset.notes ? { notes: preset.notes } : {}),
    params: preset.params,
    exportedAt: new Date().toISOString(),
  };
}

export function libraryToFile(presets: readonly LibraryPreset[]): LibraryFile {
  return {
    format: LIBRARY_FILE_FORMAT,
    exportedAt: new Date().toISOString(),
    presets: presets.map(presetToFile),
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function paramsFromRawBytes(bytes: Uint8Array): PresetParams {
  const order: LiveParamName[] = [
    "type",
    "gain",
    "tone",
    "reverb",
    "feedback",
    "volume",
    "time",
    "mix",
    "modulation",
    "cabinet",
    "irSection",
    "delaySection",
    "toneSection",
  ];
  const raw: Partial<Record<string, number>> = {};
  order.forEach((name, i) => {
    raw[name] = bytes[i] ?? 0;
  });
  return clampParams(raw);
}

export { hexToBytes };
