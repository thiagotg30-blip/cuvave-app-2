import type { LibraryPreset, PresetParams } from "./types";

const STORAGE_KEY = "cuvave-preset-studio:library:v1";

function load(): LibraryPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(presets: readonly LibraryPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listPresets(): LibraryPreset[] {
  return load().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function addPreset(name: string, params: PresetParams, notes?: string): LibraryPreset {
  const now = new Date().toISOString();
  const preset: LibraryPreset = { id: makeId(), name, ...(notes ? { notes } : {}), params, createdAt: now, updatedAt: now };
  const all = load();
  all.push(preset);
  save(all);
  return preset;
}

export function updatePreset(id: string, changes: Partial<Pick<LibraryPreset, "name" | "notes" | "params">>): void {
  const all = load();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...changes, updatedAt: new Date().toISOString() };
  save(all);
}

export function removePreset(id: string): void {
  save(load().filter((p) => p.id !== id));
}

export function importPresets(presets: readonly { name: string; notes?: string; params: PresetParams }[]): LibraryPreset[] {
  const now = new Date().toISOString();
  const all = load();
  const added = presets.map((p) => ({
    id: makeId(),
    name: p.name,
    ...(p.notes ? { notes: p.notes } : {}),
    params: p.params,
    createdAt: now,
    updatedAt: now,
  }));
  save([...all, ...added]);
  return added;
}
