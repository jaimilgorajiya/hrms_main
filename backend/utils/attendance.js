// Backend attendance utils
export const computeWorkingMinutes = (punches, breaks = [], shiftConfig = null) => {
    if (!punches || punches.length === 0) return 0;

    const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Earliest punch in
    const firstIn = sorted.find(p => p.type === 'IN');
    if (!firstIn) return 0;
    
    const startTime = new Date(firstIn.time);
    
    // Latest punch out or current time if currently clocked in
    const lastPunch = sorted[sorted.length - 1];
    let endTime;
    
    if (lastPunch.type === 'OUT') {
        endTime = new Date(lastPunch.time);
    } else {
        // Still clocked in, count till now (but only if it's the same day or similar logic?)
        // For simplicity, following previous logic of using Date.now()
        endTime = new Date();
    }

    const totalMs = endTime - startTime;
    return Math.max(0, Math.round(totalMs / 60000));
};

export const formatMinutes = (mins) => {
    if (!mins) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};
