import type { InfographicSpec } from './viz/types';

const LS_KEY = 'sat-brain-infographic-specs-v1';

/**
 * Load all infographic specs from localStorage
 */
function loadAll(): Record<string, InfographicSpec> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error loading infographic specs:', error);
    return {};
  }
}

/**
 * Save all infographic specs to localStorage
 */
function saveAll(map: Record<string, InfographicSpec>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error saving infographic specs:', error);
  }
}

/**
 * Get infographic spec for a specific summary
 * @param summaryId - The ID of the summary
 * @returns The infographic spec or null if not found
 */
export function getInfographicSpec(summaryId: string): InfographicSpec | null {
  const map = loadAll();
  return map[summaryId] || null;
}

/**
 * Save an infographic spec
 * @param spec - The infographic spec to save
 */
export function saveInfographicSpec(spec: InfographicSpec): void {
  const map = loadAll();
  map[spec.summaryId] = spec;
  saveAll(map);
}

/**
 * Delete an infographic spec
 * @param summaryId - The ID of the summary whose infographic to delete
 * @returns true if deleted, false if not found
 */
export function deleteInfographicSpec(summaryId: string): boolean {
  const map = loadAll();
  if (map[summaryId]) {
    delete map[summaryId];
    saveAll(map);
    return true;
  }
  return false;
}

/**
 * Get all infographic specs
 * @returns Array of all infographic specs
 */
export function getAllInfographicSpecs(): InfographicSpec[] {
  const map = loadAll();
  return Object.values(map);
}

/**
 * Clear all infographic specs
 */
export function clearAllInfographicSpecs(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (error) {
    console.error('Error clearing infographic specs:', error);
  }
}

/**
 * Check if an infographic exists for a summary
 * @param summaryId - The ID of the summary
 * @returns true if an infographic exists
 */
export function hasInfographic(summaryId: string): boolean {
  const map = loadAll();
  return !!map[summaryId];
}

/**
 * Update an existing infographic spec
 * @param summaryId - The ID of the summary
 * @param updates - Partial spec to merge with existing
 * @returns The updated spec or null if not found
 */
export function updateInfographicSpec(
  summaryId: string,
  updates: Partial<InfographicSpec>
): InfographicSpec | null {
  const map = loadAll();
  const existing = map[summaryId];
  
  if (!existing) {
    return null;
  }

  const updated: InfographicSpec = {
    ...existing,
    ...updates,
    summaryId, // Ensure summaryId doesn't change
    metadata: {
      ...existing.metadata,
      ...updates.metadata,
      updatedAt: new Date().toISOString()
    }
  };

  map[summaryId] = updated;
  saveAll(map);
  
  return updated;
}
