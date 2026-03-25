// Backend attendance utils
export const computeWorkingMinutes = (punches, breaks = [], shiftConfig = null) => {
    const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));

    let totalMs = 0;
    for (let i = 0; i < sorted.length - 1; i += 2) {
        if (sorted[i].type === 'IN' && sorted[i + 1]?.type === 'OUT') {
            totalMs += new Date(sorted[i + 1].time) - new Date(sorted[i].time);
        }
    }

    if (sorted.length % 2 !== 0 && sorted[sorted.length - 1]?.type === 'IN') {
        const pStart = new Date(sorted[sorted.length - 1].time);
        // Only count up to now if same day? 
        // For simplicity:
        totalMs += Date.now() - pStart.getTime();
    }

    // Subtract actual breaks taken
    breaks.forEach(b => {
        const start = new Date(b.start);
        const end = b.end ? new Date(b.end) : new Date();
        totalMs -= (end - start);
    });

    return Math.max(0, Math.round(totalMs / 60000));
};

export const formatMinutes = (mins) => {
    if (!mins) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};
