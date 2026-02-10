import type { ComparisonSettings, DiffStats } from '../types';

/**
 * Parse a plotfl file content (space-separated float values) into a number array.
 */
export function parsePlotfl(content: string): number[] {
  return content
    .split(/\s+/)
    .filter(s => s.trim() !== '')
    .map(parseFloat)
    .filter(n => !isNaN(n));
}

/**
 * Compare two parsed plotfl arrays and return diff statistics.
 */
export function compareResults(
  reference: number[],
  target: number[],
  settings: ComparisonSettings
): { status: 'pass' | 'fail'; diff_stats: DiffStats } {
  const minLen = Math.min(reference.length, target.length);
  const maxLen = Math.max(reference.length, target.length);

  let sumDiff = 0;
  let sumSqDiff = 0;
  let maxDiff = 0;
  let numMismatches = 0;

  for (let i = 0; i < minLen; i++) {
    const diff = Math.abs(target[i] - reference[i]);

    const threshold =
      settings.tolerance_type === 'absolute'
        ? settings.tolerance_value
        : Math.abs(reference[i]) * settings.tolerance_value;

    if (diff > threshold) {
      numMismatches++;
    }

    sumDiff += diff;
    sumSqDiff += diff * diff;
    maxDiff = Math.max(maxDiff, diff);
  }

  // If lengths differ, count extra values as mismatches
  numMismatches += maxLen - minLen;

  const totalValues = maxLen;

  return {
    status: numMismatches === 0 ? 'pass' : 'fail',
    diff_stats: {
      mean_diff: totalValues > 0 ? sumDiff / totalValues : 0,
      max_diff: maxDiff,
      rms_diff: totalValues > 0 ? Math.sqrt(sumSqDiff / totalValues) : 0,
      num_mismatches: numMismatches,
      total_values: totalValues,
    },
  };
}
