import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type IssueType, type DuplicateMatch, ISSUE_TYPES, ISSUE_TYPE_ICONS, ISSUE_TYPE_COLORS } from '@/lib/supabase';

// ── Step indicator ─────────────────────────────────────────────────────────
function StepDot({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
      done ? 'bg-teal-500 text-white' :
      active ? 'bg-teal-500/20 border-2 border-teal-500 text-teal-500' :
      'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
    }`}>
      {done ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : num}
    </div>
  );
}

// ── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-2 px-2 py-1 rounded-lg bg-teal-500/15 text-teal-500 text-xs font-semibold hover:bg-teal-500/30 transition-all flex items-center gap-1"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export function ReportForm() {
  const navigate = useNavigate();

  // Form state
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateMatch | null>(null);

  // ── GPS ─────────────────────────────────────────────────────────────────
  const captureGPS = () => {
    setLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocating(false);
      setShowManual(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === 1
            ? 'Location permission denied. You can enter coordinates manually.'
            : 'Could not get your location. Try again or enter manually.'
        );
        setShowManual(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data.display_name) setLocationText(data.display_name);
    } catch {
      // Non-critical — skip silently
    }
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError('Please enter valid latitude (−90 to 90) and longitude (−180 to 180).');
      return;
    }
    setLatitude(lat);
    setLongitude(lng);
    setLocationError(null);
    reverseGeocode(lat, lng);
  };

  // ── Photo ────────────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Photo must be under 10 MB.');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }, [photoPreview]);

  // ── Upload photo to Supabase storage ──────────────────────────────────────
  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(fileName, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      // Common error: bucket doesn't exist or RLS blocked upload
      throw new Error(
        uploadError.message.includes('not found') || uploadError.message.includes('does not exist')
          ? 'Storage bucket "report-photos" not found. Please create it in your Supabase dashboard (Storage → New bucket → "report-photos" → Public).'
          : `Photo upload failed: ${uploadError.message}`
      );
    }

    const { data: urlData } = supabase.storage.from('report-photos').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!issueType) {
      setError('Please select an issue type.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload photo (optional — continue without it if no file chosen)
      let photoUrl: string | null = null;
      if (photo) {
        setSubmitStep('Uploading photo…');
        try {
          photoUrl = await uploadPhoto(photo);
        } catch (uploadErr) {
          // Photo upload failed — ask user if they want to continue without photo
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Photo upload failed.';
          setError(msg + '\n\nTip: You can also submit without a photo by removing it.');
          setSubmitting(false);
          setSubmitStep('');
          return;
        }
      }

      // 2. Check for duplicate (only if location is available)
      let existingReport: DuplicateMatch | null = null;
      if (latitude !== null && longitude !== null) {
        setSubmitStep('Checking for duplicates…');
        try {
          const { data: dupData, error: dupError } = await supabase
            .rpc('find_duplicate_report', {
              p_issue_type: issueType,
              p_lat: latitude,
              p_lng: longitude,
            })
            .maybeSingle();

          if (!dupError && dupData) {
            existingReport = dupData as unknown as DuplicateMatch;
          }
          // If dupError, just skip duplicate check silently
        } catch {
          // Non-critical — proceed
        }
      }

      // 3a. Link to existing duplicate
      if (existingReport) {
        setSubmitStep('Linking to existing report…');
        try {
          await supabase.rpc('link_duplicate', { p_parent_id: existingReport.id });
        } catch {
          // Non-critical — proceed showing tracking ID anyway
        }
        setDuplicateInfo({ ...existingReport, duplicate_count: existingReport.duplicate_count + 1 });
        setTrackingId(existingReport.tracking_id);
      } else {
        // 3b. Insert new report
        setSubmitStep('Submitting report…');
        const { data, error: insertError } = await supabase
          .from('reports')
          .insert({
            issue_type: issueType,
            description: description.trim() || null,
            photo_url: photoUrl,
            latitude,
            longitude,
            location_text: locationText.trim() || null,
          })
          .select('tracking_id')
          .single();

        if (insertError) {
          throw new Error(`Failed to submit report: ${insertError.message}`);
        }

        setTrackingId(data.tracking_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      setSubmitStep('');
    }
  };

  // ── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setTrackingId(null);
    setDuplicateInfo(null);
    setIssueType('');
    setDescription('');
    clearPhoto();
    setLatitude(null);
    setLongitude(null);
    setLocationText('');
    setManualLat('');
    setManualLng('');
    setShowManual(false);
    setError(null);
  };

  // Current step for progress indicator
  const currentStep = !issueType ? 1 : !photo && !photoPreview ? 2 : latitude === null ? 3 : 4;

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (trackingId) {
    const isDuplicate = duplicateInfo !== null;
    const totalCount = isDuplicate ? duplicateInfo!.duplicate_count : 1;

    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Top accent bar */}
          <div className={`h-2 w-full ${isDuplicate ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-teal-400 to-cyan-500'}`} />

          <div className="p-8 text-center">
            {/* Icon */}
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 ${
              isDuplicate ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-teal-100 dark:bg-teal-900/30'
            }`}>
              {isDuplicate ? (
                <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {isDuplicate ? (
              <>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Already Reported!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">
                  This issue has been reported{' '}
                  <span className="font-bold text-amber-500">{totalCount} {totalCount === 1 ? 'time' : 'times'}</span>{' '}
                  nearby. Your report is added to the same ticket — boosting its priority score.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Report Submitted! 🎉</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">
                  Your report has been received and routed to the right department. Save your tracking ID below to check for updates.
                </p>
              </>
            )}

            {/* Tracking ID card */}
            <div className={`rounded-2xl border-2 border-dashed p-6 mb-6 ${
              isDuplicate
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'
                : 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30'
            }`}>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-2">
                {isDuplicate ? 'Existing Tracking ID' : 'Your Tracking ID'}
              </p>
              <div className="flex items-center justify-center gap-1">
                <p className={`text-3xl font-black font-mono tracking-wider ${isDuplicate ? 'text-amber-500' : 'text-teal-500'}`}>
                  {trackingId}
                </p>
                <CopyButton text={trackingId} />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                Use this ID on the Track page to follow your report's progress
              </p>
            </div>

            {/* What happens next */}
            {!isDuplicate && (
              <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                {[
                  { icon: '🤖', label: 'AI classifying', sub: 'Severity & dept' },
                  { icon: '🏢', label: 'Dept notified', sub: 'Within minutes' },
                  { icon: '⏱️', label: 'SLA clock', sub: 'Starts now' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{s.label}</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500">{s.sub}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/track?id=${trackingId}`)}
                className={`flex-1 px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:scale-[1.02] ${
                  isDuplicate
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400'
                }`}
              >
                Track This Report →
              </button>
              <button
                onClick={resetForm}
                className="flex-1 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Report Another Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-semibold mb-3">
          📸 New Report
        </div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Report a Civic Issue</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Help improve your community. No account needed — takes under 60 seconds.
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { num: 1, label: 'Issue type' },
          { num: 2, label: 'Photo' },
          { num: 3, label: 'Location' },
          { num: 4, label: 'Submit' },
        ].map((step, i, arr) => (
          <div key={step.num} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1">
              <StepDot num={step.num} active={currentStep === step.num} done={currentStep > step.num} />
              <span className="text-[9px] text-slate-400 dark:text-slate-600 font-medium hidden sm:block">{step.label}</span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full mb-3 sm:mb-0 transition-colors ${currentStep > step.num ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── STEP 1: Issue type ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
            Issue Type <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Select the category that best describes the problem.</p>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            {ISSUE_TYPES.map((type) => {
              const selected = issueType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIssueType(type)}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all group ${
                    selected
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 scale-[1.03] shadow-md shadow-teal-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: ISSUE_TYPE_COLORS[type] + '18' }}
                  >
                    {ISSUE_TYPE_ICONS[type]}
                  </div>
                  <span className={`text-xs font-semibold text-center leading-tight ${selected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    {type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2: Photo ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Photo
            </label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">Optional</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">A photo makes it easier for staff to verify and prioritize.</p>

          {photoPreview ? (
            <div className="relative group">
              <img src={photoPreview} alt="Preview" className="w-full h-56 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 text-slate-700 text-sm font-semibold shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Remove photo
                </button>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/50 text-white text-[10px] font-medium">
                ✓ {photo ? (photo.size / 1024 / 1024).toFixed(1) + ' MB' : 'Photo ready'}
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-all group">
              <div className="flex flex-col items-center gap-2 select-none">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 transition-colors">
                  <svg className="w-7 h-7 text-slate-400 dark:text-slate-600 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    Tap to add a photo
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">JPG, PNG, WEBP — up to 10 MB</p>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* ── STEP 3: Location ───────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Location</label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">Optional but helpful</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Helps staff pinpoint and verify the issue on a map.</p>

          <button
            type="button"
            onClick={captureGPS}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-medium text-sm disabled:opacity-50
              bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400
              hover:bg-blue-100 dark:hover:bg-blue-900/40
              border border-blue-200 dark:border-blue-900"
          >
            {locating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Getting your location…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {latitude !== null ? '✓ Location captured — tap to update' : 'Use my GPS location'}
              </>
            )}
          </button>

          {locationError && (
            <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{locationError}</span>
            </div>
          )}

          {latitude !== null && longitude !== null && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 font-mono">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
                {locationText && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{locationText}</p>
                )}
              </div>
            </div>
          )}

          {/* Manual entry toggle */}
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="mt-2 text-xs text-slate-400 dark:text-slate-500 hover:text-teal-500 dark:hover:text-teal-400 transition-colors font-medium"
          >
            {showManual ? '▲ Hide' : '▼ Enter coordinates manually'}
          </button>

          {showManual && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Latitude (e.g. 28.6139)"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-xs focus:outline-none focus:border-teal-500"
              />
              <input
                type="text"
                placeholder="Longitude (e.g. 77.2090)"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-xs focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleManualLocation}
                className="px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 transition-colors whitespace-nowrap"
              >
                Set
              </button>
            </div>
          )}
        </div>

        {/* ── STEP 4: Description ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Description</label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">Optional</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            Urgency keywords like "flooding", "dangerous", or "blocked" increase the priority score.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Large pothole on the main road near the school gate, approximately 2 feet wide…"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 resize-none transition-all"
          />
          <div className="text-right text-[10px] text-slate-400 mt-1">{description.length}/500</div>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="whitespace-pre-wrap leading-relaxed">{error}</div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !issueType}
          className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-base hover:from-teal-500 hover:to-cyan-500 transition-all shadow-lg hover:shadow-teal-500/25 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="w-5 h-5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">{submitStep || 'Submitting…'}</span>
            </>
          ) : !issueType ? (
            'Select an issue type to continue'
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Submit Report
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
          🔒 No account needed · Your data is never sold · Free forever
        </p>
      </form>
    </div>
  );
}
