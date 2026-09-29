import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API_URL from '../config/api';
import { 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  ExternalLink, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  MessageSquare
} from 'lucide-react';

const COMMON_REASONS = [
  'Client Meeting',
  'Work From Home (WFH)',
  'On-Site Visit',
  'Traveling for Business',
  'Field Duty / Inspection'
];

export default function PunchVerify() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  
  // Status states: 'init' | 'locating' | 'submitting' | 'requires_reason' | 'success' | 'error'
  const [status, setStatus] = useState('init');
  const [errorMessage, setErrorMessage] = useState('');
  const [geofenceData, setGeofenceData] = useState(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // 1. Validate Token on Mount
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token. Please send "punch in" or "punch out" on WhatsApp to receive a link.');
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/whatsapp/verify-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!data.success) {
          setStatus('error');
          setErrorMessage(data.message || 'This verification link has expired or is invalid. Please request a new link on WhatsApp.');
          setLoading(false);
          return;
        }

        setTokenInfo(data);
        setLoading(false);
        // Automatically start fetching location
        requestDeviceLocation();
      } catch (err) {
        setStatus('error');
        setErrorMessage('Failed to connect to the HRMS verification server. Please check your internet connection.');
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // 2. Request High-Accuracy Hardware GPS
  const requestDeviceLocation = () => {
    setStatus('locating');
    setErrorMessage('');

    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by your browser. Please open this link in Safari or Chrome.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const acc = position.coords.accuracy;

        setCoords({ latitude: lat, longitude: lon });
        setAccuracy(acc);

        // Auto submit to backend
        submitVerification(lat, lon, acc, '');
      },
      (error) => {
        setStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. Please allow location access in your browser settings (Settings > Safari/Chrome > Location > Allow) to verify attendance.');
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage('GPS signal acquisition timed out. Please ensure GPS/Location is enabled and try again.');
        } else {
          setErrorMessage('Unable to retrieve your current location. Please check your device location settings.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // 3. Submit GPS Verification to Backend
  const submitVerification = async (lat, lon, acc, reasonText) => {
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch(`${API_URL}/api/whatsapp/verify-punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          reason: reasonText
        })
      });

      const data = await res.json();

      if (data.requiresReason) {
        setGeofenceData(data);
        setStatus('requires_reason');
        return;
      }

      if (!data.success) {
        setStatus('error');
        setErrorMessage(data.message || 'Verification failed. Please try again.');
        return;
      }

      setSuccessResult(data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage('Failed to submit punch verification. Please check your connection and try again.');
    }
  };

  // 4. Handle Out-of-Office Reason Submission
  const handleConfirmReason = (e) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other' ? customReason.trim() : (selectedReason || customReason.trim());

    if (!finalReason || finalReason.length < 3) {
      setErrorMessage('Please provide a valid reason for punching outside the office (at least 3 characters).');
      return;
    }

    if (coords) {
      submitVerification(coords.latitude, coords.longitude, accuracy, finalReason);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
              HRMS GeoLock
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                Anti-Spoof
              </span>
            </h1>
            <p className="text-xs text-slate-400">1-Tap Hardware GPS Verification</p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        
        {/* State: Initial Loading */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
            <p className="font-semibold text-white">Validating Security Token...</p>
            <p className="text-xs text-slate-400 mt-1">Establishing encrypted verification session</p>
          </div>
        )}

        {/* State: Locating GPS */}
        {!loading && status === 'locating' && (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                <MapPin className="w-9 h-9 text-indigo-400 animate-bounce" />
              </div>
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            </div>
            <h2 className="text-lg font-bold text-white">Acquiring Real Device GPS...</h2>
            <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
              Reading high-precision hardware coordinates from your device's satellite & cellular chip.
            </p>
            {tokenInfo && (
              <div className="mt-6 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3 text-xs text-slate-300">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Employee: <strong className="text-white">{tokenInfo.employeeName}</strong></span>
                <span className="text-slate-500">•</span>
                <span className="uppercase font-mono text-indigo-300">{tokenInfo.action.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        )}

        {/* State: Submitting */}
        {!loading && status === 'submitting' && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-white">Verifying Geofence & Recording...</h2>
            <p className="text-xs text-slate-400 mt-1">Cross-referencing coordinates with office boundary</p>
          </div>
        )}

        {/* State: Requires Out-of-Office Reason */}
        {!loading && status === 'requires_reason' && geofenceData && (
          <form onSubmit={handleConfirmReason} className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-amber-200">Outside Office Premises</h3>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  You are currently <strong className="text-amber-200">{geofenceData.distanceStr} away</strong> from your office ({geofenceData.branchName}, radius: {geofenceData.allowedRadius}m).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Select your reason for punching outside office:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setSelectedReason(r); setCustomReason(''); }}
                    className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      selectedReason === r 
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' 
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedReason('Other')}
                  className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    selectedReason === 'Other' 
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' 
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Other Custom Reason...
                </button>
              </div>
            </div>

            {(selectedReason === 'Other' || selectedReason === '') && (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Client meeting at Gandhinagar..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {errorMessage && (
              <p className="text-xs text-rose-400">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 font-semibold text-xs text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Confirm & Record Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* State: Success */}
        {!loading && status === 'success' && successResult && (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                {successResult.action === 'PUNCH_IN' ? 'Punched In Successfully!' : 'Punched Out Successfully!'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time GPS verified & recorded</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Employee:</span>
                <span className="font-semibold text-white">{successResult.employeeName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Time (IST):</span>
                <span className="font-semibold text-emerald-400">{successResult.time}</span>
              </div>
              {successResult.geofenceInfo?.geofenceReason && (
                <div className="flex justify-between items-start pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400 shrink-0">Geofence:</span>
                  <span className="font-medium text-slate-200 text-right ml-2">{successResult.geofenceInfo.geofenceReason}</span>
                </div>
              )}
              {accuracy && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400">GPS Accuracy:</span>
                  <span className="font-mono text-emerald-400">±{Math.round(accuracy)} meters</span>
                </div>
              )}
            </div>

            {successResult.geofenceInfo?.mapUrl && (
              <a
                href={successResult.geofenceInfo.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <span>View Coordinates on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="pt-2">
              <a
                href="whatsapp://"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Return to WhatsApp</span>
              </a>
              <p className="text-[11px] text-slate-500 mt-2">
                A confirmation message has also been sent to your WhatsApp chat.
              </p>
            </div>
          </div>
        )}

        {/* State: Error */}
        {!loading && status === 'error' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Verification Failed</h2>
              <p className="text-xs text-rose-300/90 mt-2 leading-relaxed px-2">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={requestDeviceLocation}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Location Again</span>
              </button>
              <a
                href="whatsapp://"
                className="block text-xs text-slate-400 hover:text-slate-300 transition-colors py-1"
              >
                Return to WhatsApp & Request New Link
              </a>
            </div>
          </div>
        )}

      </div>

      {/* Footer info */}
      <div className="mt-6 text-center text-xs text-slate-500 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Hardware GPS Verification • Zero Mock Spoofing Allowed</span>
      </div>
    </div>
  );
}
