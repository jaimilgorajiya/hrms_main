// Backend attendance utils
export const computeWorkingMinutes = (punches, breaks = [], shiftConfig = null) => {
    if (!punches || punches.length === 0) return 0;

    // RULE: If any IN has no corresponding OUT, we do NOT count the hours
    // Simplified: Check if the last punch of the day is OUT.
    const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));
    const lastPunch = sorted[sorted.length - 1];

    if (lastPunch.type !== 'OUT') {
        return 0; // Zero working hours until the employee does a punch out
    }

    const firstIn = sorted.find(p => p.type === 'IN');
    if (!firstIn) return 0;
    
    const startTime = new Date(firstIn.time);
    const endTime = new Date(lastPunch.time);
    
    const totalMs = endTime - startTime;
    return Math.max(0, Math.round(totalMs / 60000));
};

export const formatMinutes = (mins) => {
    if (!mins) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};
