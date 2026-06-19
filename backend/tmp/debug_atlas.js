import mongoose from 'mongoose';

const atlasURI = 'mongodb+srv://ifloriana2025_db_user:aVzggLNwT4CfYtO5@employeecrm.fotdz28.mongodb.net/test?appName=employeeCrm';

// HELPER FUNCTIONS FROM ATTENDANCE CONTROLLER
const getTodayStr = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().split('T')[0];
};

const parseTimeToMinutes = (t) => {
    if (!t) return null;
    const clean = t.trim();
    const ampm = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampm) {
        let h = parseInt(ampm[1]);
        const m = parseInt(ampm[2]);
        const isPM = ampm[3].toUpperCase() === 'PM';
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
        return h * 60 + m;
    }
    const parts = clean.split(':');
    if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
            return h * 60 + m;
        }
    }
    return null;
};

const computeWorkingMinutes = (punches, breaks) => {
    let totalMins = 0;
    let currentIn = null;

    (punches || []).forEach(p => {
        if (p.type === 'IN') {
            if (!currentIn) currentIn = new Date(p.time);
        } else if (p.type === 'OUT') {
            if (currentIn) {
                const diffMs = new Date(p.time) - currentIn;
                totalMins += Math.round(diffMs / 60000);
                currentIn = null;
            }
        }
    });

    // Deduct breaks
    let breakMins = 0;
    (breaks || []).forEach(b => {
        if (b.start && b.end) {
            const diffMs = new Date(b.end) - new Date(b.start);
            breakMins += Math.round(diffMs / 60000);
        }
    });

    return Math.max(0, totalMins - breakMins);
};

const getCorrectStatus = (record, shift) => {
    console.log("[DEBUG] getCorrectStatus started");
    if (!record) return 'Absent';
    let status = record.status || 'Present';
    console.log("[DEBUG] initial status:", status);
    
    if (!shift) {
        console.log("[DEBUG] no shift found");
        return status;
    }
    
    // FIX: Include 'Absent' so we can correct it if punches exist
    if (!['Present', 'Half Day', 'Absent'].includes(status)) {
        console.log("[DEBUG] status is not Present, Half Day or Absent:", status);
        return status;
    }
    
    if (!record.punches || record.punches.length === 0) {
        console.log("[DEBUG] no punches in record");
        return status;
    }

    const firstIn = record.punches.find(p => p.type === 'IN');
    const lastOut = [...record.punches].reverse().find(p => p.type === 'OUT');
    
    console.log("[DEBUG] firstIn found:", !!firstIn);
    console.log("[DEBUG] lastOut found:", !!lastOut);
    console.log("[DEBUG] record.date:", record.date);
    console.log("[DEBUG] getTodayStr():", getTodayStr());
    console.log("[DEBUG] record.date === getTodayStr():", record.date === getTodayStr());

    // FIX: Timezone-safe check (within 18 hours and no punch out)
    const isRecentlyPunchedIn = firstIn && !lastOut && (new Date() - new Date(firstIn.time) < 18 * 60 * 60 * 1000);
    console.log("[DEBUG] isRecentlyPunchedIn (within 18h):", isRecentlyPunchedIn);

    if (isRecentlyPunchedIn || (firstIn && !lastOut && record.date === getTodayStr())) {
        console.log("[DEBUG] User is clocked in today. Returning status upgrading from 'Absent' if needed.");
        return status === 'Absent' ? 'Present' : status;
    }
    
    // Determine day of week
    const [yr, mo, dy] = record.date.split('-').map(Number);
    const recordDate = new Date(yr, mo - 1, dy);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName  = dayNames[recordDate.getDay()];
    console.log("[DEBUG] dayName of record date:", dayName);
    
    const daySchedule = shift.schedule?.[dayName];
    if (!daySchedule) {
        console.log("[DEBUG] no daySchedule for:", dayName);
        return status;
    }
    
    const workingMinutes = computeWorkingMinutes(record.punches, record.breaks || []);
    console.log("[DEBUG] workingMinutes:", workingMinutes);
    
    let minFullDayMins = 8 * 60;
    let minHalfDayMins = 4 * 60;
    
    if (daySchedule.minFullDayHours > 0) {
        minFullDayMins = daySchedule.minFullDayHours * 60;
        if (daySchedule.minHalfHours > 0) {
            minHalfDayMins = daySchedule.minHalfHours * 60;
        } else {
            minHalfDayMins = Math.floor(minFullDayMins / 2);
        }
    } else if (daySchedule.shiftStart && daySchedule.shiftEnd) {
        const startM = parseTimeToMinutes(daySchedule.shiftStart);
        const endM   = parseTimeToMinutes(daySchedule.shiftEnd);
        console.log("[DEBUG] startM:", startM, "endM:", endM);
        if (startM !== null && endM !== null) {
            const shiftSpan = endM > startM ? endM - startM : (endM + 1440 - startM);
            let lunchMins = 0;
            if (daySchedule.lunchStart && daySchedule.lunchEnd) {
                const lsM = parseTimeToMinutes(daySchedule.lunchStart);
                const leM = parseTimeToMinutes(daySchedule.lunchEnd);
                if (lsM !== null && leM !== null && leM > lsM) {
                    lunchMins = leM - lsM;
                }
            }
            const effectiveShiftMins = Math.max(shiftSpan - lunchMins, 1);
            minFullDayMins = effectiveShiftMins;
            minHalfDayMins = Math.floor(effectiveShiftMins / 2);
        }
    }
    
    console.log("[DEBUG] minFullDayMins:", minFullDayMins);
    console.log("[DEBUG] minHalfDayMins:", minHalfDayMins);
    
    if (workingMinutes < minHalfDayMins) {
        console.log("[DEBUG] workingMinutes < minHalfDayMins => Absent");
        return 'Absent';
    } else if (workingMinutes < minFullDayMins) {
        console.log("[DEBUG] workingMinutes < minFullDayMins => Half Day");
        return 'Half Day';
    }
    console.log("[DEBUG] => Present");
    return 'Present';
};

async function run() {
    await mongoose.connect(atlasURI);
    console.log("Connected to Atlas DB");
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    const Shift = mongoose.model('Shift', new mongoose.Schema({}, { strict: false }));

    const darshan = await User.findOne({ employeeId: 'IIPLAHM-0023' });
    if (darshan) {
        const record = await Attendance.findOne({ employee: darshan._id, date: '2026-06-19' });
        const shift = await Shift.findById(darshan.workSetup?.shift);
        
        console.log("=== Running getCorrectStatus ===");
        const result = getCorrectStatus(record, shift);
        console.log("RESULT:", result);
    } else {
        console.log("Darshan Rami not found");
    }
    
    await mongoose.disconnect();
}

run().catch(console.error);
