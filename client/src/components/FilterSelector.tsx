/**
 * Filter Selector Component
 * UI để chọn filter cho camera
 */

import { FilterType } from '../types';

interface FilterSelectorProps {
    currentFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

export function FilterSelector({ currentFilter, onFilterChange }: FilterSelectorProps) {
    const filters: Array<{ type: FilterType; label: string; icon: string }> = [
        { type: 'none', label: 'None', icon: '🚫' },
        { type: 'beauty', label: 'Beauty', icon: '✨' },
        { type: 'blur', label: 'Blur BG', icon: '🌫️' },
        { type: 'glasses', label: 'Glasses', icon: '🕶️' }
    ];

    return (
        <div className="filter-selector">
            <h3 className="filter-title">📸 Camera Filters</h3>
            <div className="filter-buttons">
                {filters.map((filter) => (
                    <button
                        key={filter.type}
                        className={`filter-btn ${currentFilter === filter.type ? 'active' : ''}`}
                        onClick={() => onFilterChange(filter.type)}
                    >
                        <span className="filter-icon">{filter.icon}</span>
                        <span className="filter-label">{filter.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
