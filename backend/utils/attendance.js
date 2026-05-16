// Backend attendance utils
export const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const computeWorkingMinutes = (punches, breaks = [], shiftConfig = null) => {
    if (!punches || punches.length === 0) return 0;

    const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));
    const firstIn = sorted.find(p => p.type === 'IN');
    if (!firstIn) return 0;

    const lastPunch = sorted[sorted.length - 1];
    let endTime;

    if (lastPunch.type === 'OUT') {
        endTime = new Date(lastPunch.time);
    } else {
        // If still clocked in, check if it's an active ongoing punch from the current shift/day (e.g. less than 20 hours ago)
        const now = new Date();
        const startTime = new Date(firstIn.time);
        if (now - startTime < 20 * 3600 * 1000) {
            endTime = now;
        } else {
            return 0; // Incomplete punch from a past day
        }
    }

    const startTime = new Date(firstIn.time);
    const totalMs = endTime - startTime;
    return Math.max(0, Math.round(totalMs / 60000));
};

export const formatMinutes = (mins) => {
    if (!mins) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};
