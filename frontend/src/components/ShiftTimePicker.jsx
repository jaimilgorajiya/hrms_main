import React, { useState, useRef, useEffect } from 'react';
import TimeKeeper from 'react-timekeeper';

/**
 * ShiftTimePicker - A professional analog clock-face time picker
 * Uses react-time-keeper but wrapped in a modal for better UX in data-heavy tables
 */
const ShiftTimePicker = ({ value, onChange, placeholder = "--:--" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [internalTime, setInternalTime] = useState(value || '09:00');
    const containerRef = useRef(null);

    // Sync internal time with prop when it opens
    useEffect(() => {
        if (isOpen) {
            setInternalTime(value || '09:00');
        }
    }, [isOpen, value]);

    // To display the time in a user-friendly 12h format on the button
    const format12h = (val24h) => {
        if (!val24h) return placeholder;
        const [h, m] = val24h.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const mins = m ? m.padStart(2, '0') : '00';
        return `${hours}:${mins} ${ampm}`;
    };

    const displayValue = format12h(value);

    const handleConfirm = () => {
        onChange(internalTime);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation(); 
        onChange(''); 
        setIsOpen(false); 
    };

    return (
        <div className="shift-time-picker-wrapper" ref={containerRef} style={{ width: '100%' }}>
            <div 
                className="time-display-box" 
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '8px 10px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    textAlign: 'center',
                    fontSize: '13px',
                    minWidth: '94px', // Standard width for --:-- AM/PM
                    color: value ? '#1E293B' : '#94A3B8',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = '#3B82F6'; }}
                onMouseLeave={(e) => { e.target.style.borderColor = '#E2E8F0'; }}
            >
                {displayValue}
            </div>

            {isOpen && (
                <div 
                    className="time-picker-modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10000,
                        backdropFilter: 'blur(2px)'
                    }}
                    onClick={() => setIsOpen(false)}
                >
                    <div 
                        className="time-picker-dialog"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            fontFamily: '"Inter", "Segoe UI", sans-serif',
                            // --- React TimeKeeper Custom Theming ---
                            '--top-bg': '#336691',
                            '--top-text-color': '#94a3b8',
                            '--top-selected-color': '#ffffff',
                            '--top-colon-color': '#cbd5e1',
                            '--top-meridiem-color': '#cbd5e1',
                            
                            '--hand-line-color': '#336691',
                            '--hand-circle-center': '#336691',
                            '--hand-circle-outer': '#336691',
                            '--hand-minute-circle': '#336691',
                            
                            '--clock-wrapper-bg': '#ffffff',
                            '--clock-bg': '#f1f5f9',
                            
                            '--meridiem-selected-bg-color': '#336691',
                            '--meridiem-selected-text-color': '#ffffff',
                            '--meridiem-text-color': '#475569',
                            '--meridiem-bg-color': '#e2e8f0',
                            
                            '--numbers-text-color': '#1e293b'
                        }}
                    >
                        <TimeKeeper
                            time={internalTime}
                            onChange={(newTime) => setInternalTime(newTime.formatted24)}
                            switchToMinuteOnHourSelect
                            closeOnDone={false}
                        />
                        <div style={{
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                            borderTop: '1px solid #f0f0f0',
                            backgroundColor: '#fff'
                        }}>
                            <button 
                                onClick={handleClear}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            >
                                CLEAR
                            </button>
                            <button 
                                onClick={handleConfirm}
                                style={{
                                    padding: '6px 16px',
                                    backgroundColor: '#336691',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftTimePicker;
