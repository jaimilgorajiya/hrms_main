import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder = "Select...", 
    label = "", 
    searchable = false,
    multiple = false,
    required = false,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const toggleDropdown = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
    };

    const handleSelect = (optionValue) => {
        if (disabled) return;
        if (multiple) {
            const newValue = Array.isArray(value) ? [...value] : [];
            const index = newValue.indexOf(optionValue);
            if (index === -1) newValue.push(optionValue);
            else newValue.splice(index, 1);
            onChange(newValue);
        } else {
            onChange(optionValue);
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    const removeOption = (e, optionValue) => {
        e.stopPropagation();
        if (disabled) return;
        if (multiple && Array.isArray(value)) {
            onChange(value.filter(v => v !== optionValue));
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = (options || []).filter(option =>
        option && option.label && option.label.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSelectedLabels = () => {
        if (multiple) {
            if (!Array.isArray(value) || value.length === 0) return null;
            return options.filter(opt => value.includes(opt.value));
        }
        return options.find(opt => opt.value === value);
    };

    const selected = getSelectedLabels();

    return (
        <div ref={dropdownRef} style={{ 
            position: 'relative', 
            width: '100%', 
            zIndex: isOpen ? 1000 : 1 
        }}>
            {label && (
                <label style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '6px',
                    display: 'block'
                }}>
                    {label} {required && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                </label>
            )}

            <div
                onClick={toggleDropdown}
                style={{
                    minHeight: '44px',
                    padding: '8px 14px',
                    border: isOpen
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: disabled ? '#F8FAFC' : 'var(--bg-base)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isOpen ? '0 0 0 4px var(--accent-primary-glow)' : 'none',
                    opacity: disabled ? 0.6 : 1,
                    boxSizing: 'border-box'
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                    {multiple ? (
                        selected && selected.length > 0 ? (
                            selected.map(opt => (
                                <span key={opt.value} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'var(--accent-primary-glow)',
                                    color: 'var(--accent-primary)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: '1px solid rgba(37, 99, 235, 0.2)'
                                }}>
                                    {opt.label}
                                    <X size={12} onClick={(e) => removeOption(e, opt.value)} style={{ cursor: 'pointer' }} />
                                </span>
                            ))
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{placeholder}</span>
                        )
                    ) : (
                        <span style={{ color: selected ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '14px', fontWeight: selected ? '500' : '400' }}>
                            {selected ? selected.label : placeholder}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={18}
                    style={{
                        color: isOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        marginLeft: '8px',
                        flexShrink: 0
                    }}
                />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 99999,
                    overflow: 'hidden',
                    animation: 'ssDropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {searchable && (
                        <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', background: '#F8FAFC' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        width: '100%',
                                        height: '36px',
                                        padding: '0 10px 0 32px',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '13px',
                                        outline: 'none',
                                        background: '#FFFFFF',
                                        color: 'var(--text-primary)',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = multiple
                                    ? Array.isArray(value) && value.includes(option.value)
                                    : value === option.value;

                                return (
                                    <div
                                        key={option.value}
                                        onClick={(e) => { e.stopPropagation(); handleSelect(option.value); }}
                                        style={{
                                            padding: '10px 12px',
                                            fontSize: '13.5px',
                                            fontWeight: isSelected ? '600' : '400',
                                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                            backgroundColor: isSelected ? 'var(--accent-primary-glow)' : 'transparent',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.15s ease',
                                            marginBottom: '2px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = '#F1F5F9';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {option.label}
                                        {isSelected && <Check size={16} color="var(--accent-primary)" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes ssDropdownIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SearchableSelect;
