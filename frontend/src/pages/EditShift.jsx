import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, RotateCcw } from 'lucide-react';
import ShiftTimePicker from '../components/ShiftTimePicker';
import HourMinutePicker from '../components/HourMinutePicker';
import HourDurationSelect from '../components/HourDurationSelect';
import Swal from 'sweetalert2';
import '../styles/AddShift.css';

const EditShift = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [loading, setLoading] = useState(true);

    const initialFormData = {
        shiftName: '',
        shiftCode: '',
        multiplePunchAllowed: false,
        requireOutOfRangeReason: false,
        hoursType: 'Full Shift Hours',
        attendanceOnProductiveHours: false,
        deductBreakIfNotTaken: false,
        deductFullBreakIfLessTaken: false,
        attendanceRequestRemarkPolicy: 'None',
        missingPunchRemarkPolicy: 'None',
        outOfRangeRemarkPolicy: 'None',
        missingPunchRequestDays: 0,
        pastAttendanceRequestDays: 0,
        autoSelectAlternateShift: false,
        allowAttendanceModification: false,
        weekOffType: 'Selected Weekdays',
        weekOffDays: [],
        weekOffsPerWeek: 0,
        weekOffsPerMonth: 0,
        hasAlternateWeekOff: false,
        lateEarlyType: 'Combined',
        maxLateInMinutes: 0,
        maxEarlyOutMinutes: 0,
        applyLeaveIfLimitExceeded: false,
        leaveTypeIfExceeded: 'Half Day',
        requireLateReason: false,
        requireEarlyOutReason: false,
        lateEarlyApplyOnExtraDay: false,
        deductLatePenaltyFromWorkHours: false,
        removeLateEarlyAfterFullHours: false,
        allowShortLeave: false,
        monthlyShortLeaves: 0,
        shortLeaveMinutes: 0,
        shortLeaveType: 'Default',
        shortLeaveBufferMinutes: 0,
        shortLeaveDays: '',
        applySandwichLeave: false,
        applyHalfDayBeforeFixedTimeout: false,
        applyLeaveOnHoliday: false,
        applyLeaveOnWeekOff: false,
        generatePenaltyOnAbsent: false,
        penaltyType: 'Flat',
        penaltyValue: 0,
        extraDayApprovalPolicy: 'None',
        needApprovalExtraHoursWeekdays: false,
        needOTRequestSameDay: false,
        otRequestType: 'Get approval before overtime work',
        extraPayoutMultiplier: 'Default',
        compOffOnExtraDay: false,
        compOffOnExtraHoursWorkingDay: false,
        compOffExpiryType: 'None',
        compOffExpireDays: 0,
        maxCompOffInMonth: 0,
        applyCompOffOnPastDate: false,
        excludeCompOffWithAutoLeave: false,
        breakMode: 'Defined Minutes',
        breakApprovalFaceApp: false,
        breakApprovalEmployeeApp: false,
        sameRulesForAllDays: false,
        flexibleShiftHours: false,
        schedule: {
            monday: {}, tuesday: {}, wednesday: {}, thursday: {}, 
            friday: {}, saturday: {}, sunday: {}
        }
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        fetchShiftData();
    }, [id]);

    const fetchShiftData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/shifts/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setFormData(data.shift);
            } else {
                Swal.fire('Error', 'Failed to load shift data', 'error');
                navigate('/admin/shift/manage');
            }
        } catch (error) {
            console.error('Error fetching shift:', error);
            Swal.fire('Error', 'Failed to load shift data', 'error');
            navigate('/admin/shift/manage');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = value;
        if (type === 'checkbox') {
            finalValue = checked;
        } else if (type === 'number') {
            finalValue = Number(value);
        } else if (value === 'true') {
            finalValue = true;
        } else if (value === 'false') {
            finalValue = false;
        }

        setFormData(prev => {
            const updates = { [name]: finalValue };
            
            // Mutual exclusivity for shift rules
            if (name === 'sameRulesForAllDays' && finalValue === true) {
                updates.flexibleShiftHours = false;
            } else if (name === 'flexibleShiftHours' && finalValue === true) {
                updates.sameRulesForAllDays = false;
                // Optional: clear the table or reset when flexible is chosen
            }

            return {
                ...prev,
                ...updates
            };
        });
    };

    const handleWeekOffDaysChange = (day) => {
        setFormData(prev => ({
            ...prev,
            weekOffDays: prev.weekOffDays.includes(day)
                ? prev.weekOffDays.filter(d => d !== day)
                : [...prev.weekOffDays, day]
        }));
    };

    const handleScheduleChange = (day, field, value) => {
        setFormData(prev => {
            if (prev.sameRulesForAllDays) {
                const newSchedule = { ...prev.schedule };
                days.forEach(d => {
                    newSchedule[d] = {
                        ...newSchedule[d],
                        [field]: value
                    };
                });
                return {
                    ...prev,
                    schedule: newSchedule
                };
            }

            return {
                ...prev,
                schedule: {
                    ...prev.schedule,
                    [day]: {
                        ...prev.schedule[day],
                        [field]: value
                    }
                }
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/shifts/update/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Shift updated successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                navigate('/admin/shift/manage');
            } else {
                Swal.fire('Error', data.message || 'Failed to update shift', 'error');
            }
        } catch (error) {
            console.error('Error updating shift:', error);
            Swal.fire('Error', 'Failed to update shift', 'error');
        }
    };

    const handleReset = () => {
        fetchShiftData();
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    if (loading) {
        return <div className="loading-container">Loading shift data...</div>;
    }

    return (
        <div className="add-shift-container">
            <div className="shift-header">
                <h1 className="profile-title">Edit Shift</h1>
            </div>

            <form onSubmit={handleSubmit}>
                {/* SECTION 1 - BASIC SHIFT DETAILS */}
                <div className="shift-card">
                    <h2 className="card-title">Basic Shift Details</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <label>Shift Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="shiftName"
                                value={formData.shiftName}
                                onChange={handleInputChange}
                                placeholder="Enter shift name"
                                required
                            />
                        </div>

                        <div className="form-group-shift">
                            <label>Shift Code</label>
                            <input
                                type="text"
                                name="shiftCode"
                                value={formData.shiftCode}
                                onChange={handleInputChange}
                                placeholder="e.g. S1, S2"
                            />
                        </div>

                        <div className="form-group-shift">
                            <label>Required Out Of Range Reason</label>
                            <select name="requireOutOfRangeReason" value={formData.requireOutOfRangeReason} onChange={handleInputChange}>
                                <option value={false}>No</option>
                                <option value={true}>Yes</option>
                            </select>
                        </div>

                    

                    
                    </div>
                </div>

                {/* SECTION 2 - WEEK OFF SETTINGS */}
                <div className="shift-card">
                    <h2 className="card-title">Week Off Settings</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <label>Week Off Type <span className="required">*</span></label>
                            <select name="weekOffType" value={formData.weekOffType} onChange={handleInputChange}>
                                <option value="Selected Weekdays">Selected Weekdays</option>
                                <option value="Manual Week Off">Manual Week Off</option>
                            </select>
                        </div>

                        {/* Show different fields based on Week Off Type */}
                        {formData.weekOffType === 'Selected Weekdays' && (
                            <>
                                <div className="form-group-shift full-width">
                                    <label>Week off Days</label>
                                    <div className="checkbox-group">
                                        {weekDays.map(day => (
                                            <label key={day} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.weekOffDays.includes(day)}
                                                    onChange={() => handleWeekOffDaysChange(day)}
                                                />
                                                <span>{day}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                              
                            </>
                        )}

                        {formData.weekOffType === 'Manual Week Off' && (
                            <>
                                <div className="form-group-shift">
                                    <label>Number of week-offs allowed in a week <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        name="weekOffsPerWeek"
                                        value={formData.weekOffsPerWeek || ''}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="7"
                                        placeholder="Enter number"
                                    />
                                </div>

                                <div className="form-group-shift">
                                    <label>Number of week-offs allowed in a month</label>
                                    <input
                                        type="number"
                                        name="weekOffsPerMonth"
                                        value={formData.weekOffsPerMonth || ''}
                                        onChange={handleInputChange}
                                        min="0"
                                        placeholder="0 for no limit"
                                    />
                                    <small style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                        0 for no limit, possible week-offs are allowed
                                    </small>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* SECTION 3 - LATE IN / EARLY OUT SETTINGS */}
                <div className="shift-card">
                    <h2 className="card-title">Late In / Early Out Settings</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <label>Late In Early Out Type</label>
                            <select name="lateEarlyType" value={formData.lateEarlyType} onChange={handleInputChange}>
                                <option value="Combined">Combined</option>
                                <option value="Separate">Separate</option>
                            </select>
                        </div>

                        {formData.lateEarlyType === 'Combined' ? (
                            <div className="form-group-shift">
                                <label>Maximum Combined Minutes (Late In + Early Out)</label>
                                <input
                                    type="number"
                                    name="maxLateInMinutes"
                                    value={formData.maxLateInMinutes}
                                    onChange={handleInputChange}
                                    min="0"
                                    placeholder="e.g. 30"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="form-group-shift">
                                    <label>Maximum Late In (Minutes)</label>
                                    <input
                                        type="number"
                                        name="maxLateInMinutes"
                                        value={formData.maxLateInMinutes}
                                        onChange={handleInputChange}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group-shift">
                                    <label>Maximum Early Out (Minutes)</label>
                                    <input
                                        type="number"
                                        name="maxEarlyOutMinutes"
                                        value={formData.maxEarlyOutMinutes}
                                        onChange={handleInputChange}
                                        min="0"
                                    />
                                </div>
                            </>
                        )}


                    

                        {formData.lateEarlyType === 'Combined' ? (
                            <div className="form-group-shift">
                                <label>Required Reason For Late In / Early Out</label>
                                <select
                                    name="requireLateReason"
                                    value={formData.requireLateReason}
                                    onChange={(e) => {
                                        handleInputChange(e);
                                        handleInputChange({ target: { name: 'requireEarlyOutReason', value: e.target.value, type: 'select' }});
                                    }}
                                >
                                    <option value={false}>No</option>
                                    <option value={true}>Yes</option>
                                </select>
                            </div>
                        ) : (
                            <>
                                <div className="form-group-shift">
                                    <label>Required Reason Of Late In</label>
                                    <select name="requireLateReason" value={formData.requireLateReason} onChange={handleInputChange}>
                                        <option value={false}>No</option>
                                        <option value={true}>Yes</option>
                                    </select>
                                </div>
                                <div className="form-group-shift">
                                    <label>Required Reason Of Early Out</label>
                                    <select name="requireEarlyOutReason" value={formData.requireEarlyOutReason} onChange={handleInputChange}>
                                        <option value={false}>No</option>
                                        <option value={true}>Yes</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="form-group-shift">
                            <label>Apply Late In / Early Out on Week Off Day</label>
                            <select name="lateEarlyApplyOnExtraDay" value={formData.lateEarlyApplyOnExtraDay} onChange={handleInputChange}>
                                <option value={false}>No</option>
                                <option value={true}>Yes</option>
                            </select>
                        </div>
                    </div>
                </div>



                {/* SECTION 8 - BREAK SETTINGS */}
                <div className="shift-card">
                    <h2 className="card-title">Break Settings</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <label>Take Breaks Setting <span className="required">*</span></label>
                            <select name="breakMode" value={formData.breakMode} onChange={handleInputChange}>
                                <option value="Defined Minutes">Defined Minutes</option>
                                <option value="Anytime Between Shift">Anytime Between Shift</option>
                            </select>
                        </div>

               

                      
                    </div>
                </div>

                {/* SECTION: OT & EXTRA DAY SETTINGS */}
                <div className="shift-card">
                    <h2 className="card-title">OT & Extra Day Settings</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <label>Extra Day Holiday Approval Policy</label>
                            <select name="extraDayApprovalPolicy" value={formData.extraDayApprovalPolicy} onChange={handleInputChange}>
                                <option value="None">None</option>
                                <option value="Week Off">Week Off</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Week off and holiday">Week off and holiday</option>
                            </select>
                        </div>

                        <div className="form-group-shift">
                            <label>Extra Day Payout Multiplier (Benefit)</label>
                            <select name="extraPayoutMultiplier" value={formData.extraPayoutMultiplier} onChange={handleInputChange}>
                                <option value="Default">2x (Double Pay Total)</option>
                                <option value="1x">1x (Regular Pay Only)</option>
                                <option value="1.5x">1.5x (1.5x Pay Total)</option>
                                <option value="2x">2x (Double Pay Total)</option>
                            </select>
                            <small style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                This multiplier determines the total pay for working on a week-off (e.g. 2x = Double Pay).
                            </small>
                        </div>
                    </div>
                </div>

                {/* SECTION 9 - WEEKLY SHIFT TIME TABLE */}
                <div className="shift-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Weekly Shift Time Table</h2>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                <input 
                                    type="checkbox" 
                                    name="sameRulesForAllDays" 
                                    checked={formData.sameRulesForAllDays} 
                                    onChange={handleInputChange} 
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#E11D48' }}
                                />
                                Same Rules for All days
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                <input 
                                    type="checkbox" 
                                    name="flexibleShiftHours" 
                                    checked={formData.flexibleShiftHours} 
                                    onChange={handleInputChange} 
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#E11D48' }}
                                />
                                Flexible Shift Hours
                            </label>
                        </div>
                    </div>
                    <div className="table-wrapper">
                        <table className="shift-schedule-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    {weekDays.map(day => <th key={day}>{day}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="row-label">Shift Start Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.shiftStart || ''}
                                                onChange={(val) => handleScheduleChange(day, 'shiftStart', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Shift End Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.shiftEnd || ''}
                                                onChange={(val) => handleScheduleChange(day, 'shiftEnd', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Lunch Break Start Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.lunchStart || ''}
                                                onChange={(val) => handleScheduleChange(day, 'lunchStart', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Lunch Break End Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.lunchEnd || ''}
                                                onChange={(val) => handleScheduleChange(day, 'lunchEnd', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Tea Break Start Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.teaStart || ''}
                                                onChange={(val) => handleScheduleChange(day, 'teaStart', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Tea Break End Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.teaEnd || ''}
                                                onChange={(val) => handleScheduleChange(day, 'teaEnd', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="form-actions">
                    <button type="submit" className="btn-theme btn-theme-primary">
                        <Check size={18} /> UPDATE
                    </button>
                    <button type="button" className="btn-theme btn-theme-secondary" onClick={handleReset}>
                        <RotateCcw size={18} /> RESET
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditShift;
