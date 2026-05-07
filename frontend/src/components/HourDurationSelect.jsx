import React from 'react';

/**
 * HourDurationSelect - A custom dropdown component for selecting duration in HH:mm:ss format
 * e.g., '1:00:00', '1:15:00', '1:30:00', etc.
 */
const HourDurationSelect = ({ value, onChange }) => {
    // Generate options in 15 minute intervals from 1:00:00 up to 24:00:00
    const options = [];
    for (let hours = 1; hours <= 24; hours++) {
        for (let minutes of [0, 15, 30, 45]) {
            if (hours === 24 && minutes > 0) continue; // Cap at 24:00:00
            
            const formattedMinutes = minutes.toString().padStart(2, '0');
            const timeString = `${hours}:${formattedMinutes}:00`;
            options.push(timeString);
        }
    }

    const selectStyle = {
        width: '100%',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <select
                className="duration-dropdown"
                style={selectStyle}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="" disabled hidden>Select</option>
                {options.map((opt) => (
                    <option key={opt} value={opt} style={{ color: 'var(--text-primary)' }}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default HourDurationSelect;
