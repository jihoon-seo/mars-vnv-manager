export interface Category {
  id: string;       // e.g. "2", "2.1", "2.1.1"
  label: string;    // e.g. "2.1.1 Nine-Volume Water Over Steam"
  level: 1 | 2 | 3;
  parentId: string | null;
}

const CATEGORY_TREE: Category[] = [
  // ===== Level 1 =====
  { id: '2', label: '2 Assessment of System Analysis Module', level: 1, parentId: null },
  { id: '3', label: '3 Assessment of 3D Vessel Module', level: 1, parentId: null },

  // ===== Level 2 (under 2) =====
  { id: '2.1', label: '2.1 Conceptual Problems', level: 2, parentId: '2' },
  { id: '2.2', label: '2.2 Separate-Effects Problems', level: 2, parentId: '2' },
  { id: '2.3', label: '2.3 Integral Test Problems', level: 2, parentId: '2' },
  { id: '2.4', label: '2.4 Plant Applications', level: 2, parentId: '2' },

  // ===== Level 2 (under 3) =====
  { id: '3.1', label: '3.1 Conceptual Problems', level: 2, parentId: '3' },
  { id: '3.2', label: '3.2 Separate-Effect Problems', level: 2, parentId: '3' },
  { id: '3.3', label: '3.3 Integral Test Problems', level: 2, parentId: '3' },

  // ===== Level 3 (under 2.1) =====
  { id: '2.1.1', label: '2.1.1 Nine-Volume Water Over Steam', level: 3, parentId: '2.1' },
  { id: '2.1.2', label: '2.1.2 Nitrogen-Water Manometer Problem', level: 3, parentId: '2.1' },
  { id: '2.1.3', label: '2.1.3 Branch Reentrant Tee Problem', level: 3, parentId: '2.1' },
  { id: '2.1.4', label: '2.1.4 Cross-Flow Tee Problem', level: 3, parentId: '2.1' },
  { id: '2.1.5', label: '2.1.5 Cross Tank Problem', level: 3, parentId: '2.1' },
  { id: '2.1.6', label: '2.1.6 Three Stage Turbine', level: 3, parentId: '2.1' },
  { id: '2.1.7', label: '2.1.7 Workshop Problem 2', level: 3, parentId: '2.1' },
  { id: '2.1.8', label: '2.1.8 Workshop Problem 3', level: 3, parentId: '2.1' },
  { id: '2.1.9', label: '2.1.9 Horizontally Stratified Countercurrent Flow', level: 3, parentId: '2.1' },
  { id: '2.1.10', label: '2.1.10 Pryor\'s Pipe Problem', level: 3, parentId: '2.1' },
  { id: '2.1.11', label: '2.1.11 Multi-Dimensional Problems', level: 3, parentId: '2.1' },

  // ===== Level 3 (under 2.2) =====
  { id: '2.2.1', label: '2.2.1 Heat Transfer', level: 3, parentId: '2.2' },
  { id: '2.2.2', label: '2.2.2 Void Fraction', level: 3, parentId: '2.2' },
  { id: '2.2.3', label: '2.2.3 Critical Flow and CCFL', level: 3, parentId: '2.2' },
  { id: '2.2.4', label: '2.2.4 Blowdown Phenomena', level: 3, parentId: '2.2' },
  { id: '2.2.5', label: '2.2.5 Reflood Phenomena', level: 3, parentId: '2.2' },
  { id: '2.2.6', label: '2.2.6 Multi-dimensional Phenomena', level: 3, parentId: '2.2' },
  { id: '2.2.7', label: '2.2.7 HANARO Separate Effect Tests', level: 3, parentId: '2.2' },

  // ===== Level 3 (under 2.3) =====
  { id: '2.3.1', label: '2.3.1 LOFT Small-Break Test L3-7', level: 3, parentId: '2.3' },
  { id: '2.3.2', label: '2.3.2 LOFT L2-5', level: 3, parentId: '2.3' },
  { id: '2.3.3', label: '2.3.3 Semiscale Natural Circulation Tests', level: 3, parentId: '2.3' },

  // ===== Level 3 (under 2.4) =====
  { id: '2.4.1', label: '2.4.1 Commercial PWR Applications', level: 3, parentId: '2.4' },
  { id: '2.4.2', label: '2.4.2 CANDU Applications', level: 3, parentId: '2.4' },
  { id: '2.4.3', label: '2.4.3 Non-LOCA Analysis', level: 3, parentId: '2.4' },
  { id: '2.4.4', label: '2.4.4 LOCA Analysis', level: 3, parentId: '2.4' },
  { id: '2.4.5', label: '2.4.5 SMART Integrated Reactor Applications', level: 3, parentId: '2.4' },
  { id: '2.4.6', label: '2.4.6 HANARO Applications', level: 3, parentId: '2.4' },
  { id: '2.4.7', label: '2.4.7 3D Kinetics Coupling Analysis', level: 3, parentId: '2.4' },

  // ===== Level 3 (under 3.1) =====
  { id: '3.1.1', label: '3.1.1 Steady-State Flow in Vertical Pipes', level: 3, parentId: '3.1' },
  { id: '3.1.2', label: '3.1.2 Nine Volume Water Over Steam Problem', level: 3, parentId: '3.1' },
  { id: '3.1.3', label: '3.1.3 Fill and Drain Problem', level: 3, parentId: '3.1' },
  { id: '3.1.4', label: '3.1.4 Manometer Oscillation Problem', level: 3, parentId: '3.1' },
  { id: '3.1.5', label: '3.1.5 Heat Structure Coupling Problem', level: 3, parentId: '3.1' },
  { id: '3.1.6', label: '3.1.6 Boron Transport Problem', level: 3, parentId: '3.1' },

  // ===== Level 3 (under 3.2) =====
  { id: '3.2.1', label: '3.2.1 Heat Transfer', level: 3, parentId: '3.2' },
  { id: '3.2.2', label: '3.2.2 CCFL', level: 3, parentId: '3.2' },
  { id: '3.2.3', label: '3.2.3 Blowdown Phenomena', level: 3, parentId: '3.2' },
  { id: '3.2.4', label: '3.2.4 Reflood Phenomena', level: 3, parentId: '3.2' },
  { id: '3.2.5', label: '3.2.5 Multidimensional Phenomena', level: 3, parentId: '3.2' },
  { id: '3.2.6', label: '3.2.6 Subchannel Phenomena', level: 3, parentId: '3.2' },

  // ===== Level 3 (under 3.3) =====
  { id: '3.3.1', label: '3.3.1 LOFT Large-Break Test L2-5', level: 3, parentId: '3.3' },
];

export default CATEGORY_TREE;

/**
 * Get a flat list of all categories for use in selectors.
 * Each item is indented based on its level.
 */
export function getCategoryOptions(): { id: string; label: string; level: number }[] {
  const result: { id: string; label: string; level: number }[] = [];

  function addChildren(parentId: string | null) {
    const children = CATEGORY_TREE.filter(c => c.parentId === parentId);
    for (const child of children) {
      result.push({ id: child.id, label: child.label, level: child.level });
      addChildren(child.id);
    }
  }

  addChildren(null);
  return result;
}

/**
 * Get category label by id.
 */
export function getCategoryLabel(id: string): string {
  return CATEGORY_TREE.find(c => c.id === id)?.label ?? id;
}

/**
 * Check if a category id matches a filter (including its children).
 * e.g. filterCategory="2.1" should match "2.1", "2.1.1", "2.1.2", etc.
 */
export function matchesCategory(fileCategoryId: string | null, filterCategoryId: string): boolean {
  if (!fileCategoryId) return false;
  return fileCategoryId === filterCategoryId || fileCategoryId.startsWith(filterCategoryId + '.');
}
