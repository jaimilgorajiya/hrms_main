import React, { useState, useRef, useEffect } from 'react';

const ShiftTimePicker = ({ value, onChange, placeholder = "--:--" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [internalTime, setInternalTime] = useState(value || '09:00');
    const containerRef = useRef(null);

    useEffect(() => {
        if (isOpen) setInternalTime(value || '09:00');
    }, [isOpen, value]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const format12h = (val24h) => {
        if (!val24h) return placeholder;
        const [h, m] = val24h.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${(m || '00').padStart(2, '0')} ${ampm}`;
    };

    const handleConfirm = () => { onChange(internalTime); setIsOpen(false); };
    const handleClear = (e) => { e.stopPropagation(); onChange(''); setIsOpen(false); };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => setIsOpen(o => !o)}
                style={{
                    padding: '8px 10px', border: `1px solid ${isOpen ? '#3B82F6' : '#E2E8F0'}`,
                    borderRadius: 6, cursor: 'pointer', backgroundColor: '#fff',
                    textAlign: 'center', fontSize: 13, minWidth: 94,
                    color: value ? '#1E293B' : '#94A3B8', whiteSpace: 'nowrap',
                    boxShadow: isOpen ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
            >
                {format12h(value)}
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '110%', left: 0, zIndex: 9999,
                    background: '#fff', borderRadius: 10, padding: 16,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
                    minWidth: 200
                }}>
                    <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Select Time</div>
                    <input
                        type="time"
                        value={internalTime}
                        onChange={e => setInternalTime(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px', fontSize: 18, fontWeight: 600,
                            border: '1.5px solid #3B82F6', borderRadius: 8, outline: 'none',
                            color: 'var(--text-primary)', background: '#f8fafc', textAlign: 'center',
                            letterSpacing: 2, marginBottom: 12
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={handleClear} style={{
                            padding: '6px 14px', background: '#f1f5f9', color: 'var(--text-secondary)',
                            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
                        }}>CLEAR</button>
                        <button onClick={handleConfirm} style={{
                            padding: '6px 18px', background: '#336691', color: '#fff',
                            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
                        }}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftTimePicker;
