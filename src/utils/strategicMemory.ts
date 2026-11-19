/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  StrategicMemory,
  StrategicAngleRecord,
  BusinessBrainData,
} from '../types/brainwise';

export const FATIGUE_THRESHOLD = 3;

/**
 * Returns default empty strategic memory if undefined.
 */
export function ensureStrategicMemory(brain: BusinessBrainData): StrategicMemory {
  if (brain.strategicMemory) {
    return brain.strategicMemory;
  }
  return {
    usedAngles: [],
    fatiguedThemes: [],
    explicitExclusions: [],
    lastUpdated: new Date().toISOString().split('T')[0] || '2026-11-19',
  };
}

/**
 * Evaluates which themes exceed the fatigue threshold based on usage frequency.
 */
export function calculateFatiguedThemes(angles: StrategicAngleRecord[]): string[] {
  const themeCounts = new Map<string, number>();

  for (const record of angles) {
    const current = themeCounts.get(record.theme) || 0;
    themeCounts.set(record.theme, current + record.frequency);
  }

  const fatigued: string[] = [];
  for (const [theme, count] of themeCounts.entries()) {
    if (count >= FATIGUE_THRESHOLD) {
      fatigued.push(theme);
    }
  }

  return fatigued;
}

/**
 * Formulates strict negative constraints and anti-fatigue instructions for AI prompts.
 */
export function buildAntiFatiguePromptDirectives(memory?: StrategicMemory): string {
  if (!memory) return '';

  const directives: string[] = [];

  if (memory.fatiguedThemes && memory.fatiguedThemes.length > 0) {
    directives.push(
      `ANTI-FATIGUE WARNING: The following themes have high saturation and must NOT be repeated: ${memory.fatiguedThemes
        .map((t) => `"${t}"`)
        .join(', ')}. Explore fresh, novel strategic angles.`
    );
  }

  if (memory.usedAngles && memory.usedAngles.length > 0) {
    const recentAngles = memory.usedAngles.slice(-4).map((a) => `• "${a.angle}" (${a.theme})`);
    directives.push(
      `PREVIOUSLY USED HOOKS (DO NOT COPY DIRECTLY):\n${recentAngles.join('\n')}`
    );
  }

  if (memory.explicitExclusions && memory.explicitExclusions.length > 0) {
    directives.push(
      `FOUNDER-PROHIBITED CLAIMS & RESTRICTIONS (STRICT GROUNDING):\n${memory.explicitExclusions
        .map((e) => `• FORBIDDEN: ${e}`)
        .join('\n')}`
    );
  }

  return directives.join('\n\n');
}

/**
 * Records a new strategic angle into memory, automatically recalculating fatigued themes.
 */
export function recordStrategicAngle(
  memory: StrategicMemory,
  angle: string,
  theme: string,
  usedIn: StrategicAngleRecord['usedIn']
): StrategicMemory {
  const normalizedAngle = angle.trim();
  const normalizedTheme = theme.trim();
  const today = new Date().toISOString().split('T')[0] || '2026-11-19';

  const existingIndex = memory.usedAngles.findIndex(
    (item) =>
      item.angle.toLowerCase() === normalizedAngle.toLowerCase() ||
      (item.theme.toLowerCase() === normalizedTheme.toLowerCase() &&
        item.angle.toLowerCase().includes(normalizedAngle.toLowerCase().slice(0, 20)))
  );

  let updatedAngles: StrategicAngleRecord[];

  if (existingIndex >= 0) {
    const existing = memory.usedAngles[existingIndex]!;
    const updatedRecord: StrategicAngleRecord = {
      ...existing,
      frequency: existing.frequency + 1,
      lastUsedAt: today,
      usedIn,
    };
    updatedAngles = [
      ...memory.usedAngles.slice(0, existingIndex),
      updatedRecord,
      ...memory.usedAngles.slice(existingIndex + 1),
    ];
  } else {
    const newRecord: StrategicAngleRecord = {
      id: `ang-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      angle: normalizedAngle,
      theme: normalizedTheme,
      usedIn,
      lastUsedAt: today,
      frequency: 1,
    };
    updatedAngles = [...memory.usedAngles, newRecord];
  }

  const updatedFatigued = calculateFatiguedThemes(updatedAngles);

  return {
    ...memory,
    usedAngles: updatedAngles,
    fatiguedThemes: updatedFatigued,
    lastUpdated: today,
  };
}
