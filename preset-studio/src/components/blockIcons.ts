import { Zap, Repeat2, Waves, AudioWaveform, Box, Volume2, type LucideIcon } from "lucide-react";
import type { BlockId } from "../blocks";

export const BLOCK_ICONS: Record<BlockId, LucideIcon> = {
  drive: Zap,
  delay: Repeat2,
  reverb: Waves,
  modulation: AudioWaveform,
  cabinet: Box,
  output: Volume2,
};
