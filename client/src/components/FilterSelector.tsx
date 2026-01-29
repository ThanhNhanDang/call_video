import { useState } from 'react';
import { FilterType } from '../types';

interface FilterSelectorProps {
    currentFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

export function FilterSelector({ currentFilter, onFilterChange }: FilterSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const filters: Array<{ type: FilterType; label: string; icon: string }> = [
        { type: 'none', label: 'Không', icon: '🚫' },
        { type: 'beauty', label: 'Làm đẹp', icon: '✨' },
        { type: 'blur', label: 'Mờ nền', icon: '🌫️' },
        { type: 'glasses', label: 'Kính mắt', icon: '🕶️' }
    ];

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`filter-selector ${isOpen ? 'open' : ''}`}>
            <div className="filter-header-mobile">
                <button className="mobile-menu-btn" onClick={toggleMenu} title="Bộ lọc">
                    ✨
                </button>
            </div>

            <div className="filter-content">
                <h3 className="filter-title">📸 Bộ lọc Camera</h3>
                <div className="filter-buttons">
                    {filters.map((filter) => (
                        <button
                            key={filter.type}
                            className={`filter-btn ${currentFilter === filter.type ? 'active' : ''}`}
                            onClick={() => {
                                onFilterChange(filter.type);
                                setIsOpen(false);
                            }}
                        >
                            <span className="filter-icon">{filter.icon}</span>
                            <span className="filter-label">{filter.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
