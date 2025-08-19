import type { SortOptions, TableFilters } from '../types';

/**
 * Set the creating table state
 */
export function setCreatingTable(
  setState: (updater: any) => void,
  creating: boolean
): void {
  setState((state: any) => ({
    ui: {
      ...state.ui,
      creatingTable: creating
    }
  }));
}

/**
 * Toggle the create table modal visibility
 */
export function toggleCreateTableModal(
  setState: (updater: any) => void,
  getState: () => any
): void {
  setState((state: any) => ({
    ui: {
      ...state.ui,
      showCreateTableModal: !getState().ui.showCreateTableModal
    }
  }));
}

/**
 * Toggle the filters visibility
 */
export function toggleFilters(
  setState: (updater: any) => void,
  getState: () => any
): void {
  setState((state: any) => ({
    ui: {
      ...state.ui,
      showFilters: !getState().ui.showFilters
    }
  }));
}

/**
 * Set the view mode
 */
export function setViewMode(
  setState: (updater: any) => void,
  mode: 'grid' | 'list' | 'compact'
): void {
  setState((state: any) => ({
    ui: {
      ...state.ui,
      viewMode: mode
    }
  }));
}

/**
 * Update filters with partial filter data
 */
export function updateFilters(
  setState: (updater: any) => void,
  filters: Partial<TableFilters>
): void {
  setState((state: any) => ({
    filters: {
      ...state.filters,
      ...filters
    }
  }));
}

/**
 * Clear all filters to default values
 */
export function clearFilters(setState: (updater: any) => void): void {
  setState({
    filters: {
      status: 'all',
      playerCount: 'all',
      stakes: 'all',
      searchQuery: ''
    }
  });
}

/**
 * Set sort options
 */
export function setSortOptions(
  setState: (updater: any) => void,
  options: Partial<SortOptions>
): void {
  setState((state: any) => ({
    sortOptions: {
      ...state.sortOptions,
      ...options
    }
  }));
}
