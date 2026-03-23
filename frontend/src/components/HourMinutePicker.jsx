import React from 'react';

/**
 * HourMinutePicker - A custom composite component to handle duration in hours and minutes
 * Renders two dropdowns: one for Hours (HH) and one for Minutes (M)
 */
const HourMinutePicker = ({ value, onChange }) => {
    // Parse the incoming float value (e.g. 8.5 means 8 hours 30 mins, 8.25 means 8 hours 15 mins)
    // We expect the stored value to be in decimal hours (e.g., 8.5) or minutes (e.g. 510) 
    // Wait, the reference image shows duration like Minimum Half Day Hours.
    // If we receive a decimal representing hours:
    const numValue = parseFloat(value) || 0;
    const hours = Math.floor(numValue);
    const minutes = Math.round((numValue - hours) * 60);

    const handleHourChange = (e) => {
        const newHours = parseInt(e.target.value, 10);
        const newTotalDecimals = newHours + (minutes / 60);
        onChange(newTotalDecimals);
    };

    const handleMinuteChange = (e) => {
        const newMinutes = parseInt(e.target.value, 10);
        const newTotalDecimals = hours + (newMinutes / 60);
        onChange(newTotalDecimals);
    };

    const flexStyle = {
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    };

    const selectBaseStyle = {
        width: '55px', // Consistent small width for HH/MM pairing
        padding: '6px 8px',
        paddingRight: '18px', // Smaller padding for compact view
    };

    // Pre-calculate dropdown options
    const hourOptions = [];
    for (let i = 0; i <= 24; i++) {
        hourOptions.push(<option key={i} value={i}>{i.toString().padStart(2, '0')} h</option>);
    }

    const minuteOptions = [];
    for (let i = 0; i < 60; i += 5) { // 5-minute increments
        minuteOptions.push(<option key={i} value={i}>{i.toString().padStart(2, '0')} m</option>);
    }

    // Default "Select" states if unselected
    return (
        <div style={flexStyle}>
            <div style={{ position: 'relative' }}>
                <select 
                    className="hm-dropdown"
                    style={{...selectBaseStyle, color: value ? '#1E293B' : '#94a3b8', backgroundPosition: 'right 4px center', backgroundSize: '10px'}}
                    value={value ? hours : ''} 
                    onChange={handleHourChange}
                >
                    <option value="" disabled hidden>HH</option>
                    {hourOptions}
                </select>
            </div>
            
            <div style={{ position: 'relative' }}>
                <select 
                    className="hm-dropdown"
                    style={{...selectBaseStyle, color: value ? '#1E293B' : '#94a3b8', backgroundPosition: 'right 4px center', backgroundSize: '10px'}}
                    value={value ? minutes : ''} 
                    onChange={handleMinuteChange}
                >
                    <option value="" disabled hidden>MM</option>
                    {minuteOptions}
                </select>
            </div>
        </div>
    );
};

export default HourMinutePicker;
