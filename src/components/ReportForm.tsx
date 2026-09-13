import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type IssueType, type DuplicateMatch, ISSUE_TYPES, ISSUE_TYPE_ICONS } from '@/lib/supabase';

export function ReportForm() {
  const navigate = useNavigate();
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateMatch | null>(null);

  const captureGPS = () => {
    setLocating(true);
    setLocationError(null);
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
      if (data.display_name) {
        setLocationText(data.display_name);
      }
    } catch {
      // Non-critical — just skip
    }
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      setLocationError('Please enter valid numbers for latitude and longitude.');
      return;
    }
    setLatitude(lat);
    setLongitude(lng);
    setLocationError(null);
    reverseGeocode(lat, lng);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!issueType) {
      setError('Please select an issue type.');
      return;
    }
    if (!photo) {
      setError('Please upload a photo of the issue.');
      return;
    }

    setSubmitting(true);

    try {
      // Upload photo
      const fileExt = photo.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(fileName, photo);

      if (uploadError) throw new Error('Failed to upload photo: ' + uploadError.message);

      // Check for duplicate: same issue type within ~100m in the last 14 days
      let existingReport: DuplicateMatch | null = null;
      if (latitude !== null && longitude !== null) {
        const { data: dupData, error: dupError } = await supabase
          .rpc('find_duplicate_report', {
            p_issue_type: issueType,
            p_lat: latitude,
            p_lng: longitude,
          })
          .maybeSingle();

        if (dupError) throw new Error('Failed to check for duplicates: ' + dupError.message);
        if (dupData) {
          existingReport = dupData as unknown as DuplicateMatch;
        }
      }

      if (existingReport) {
        // Link to existing report — increment duplicate_count
        const { error: linkError } = await supabase
          .rpc('link_duplicate', { p_parent_id: existingReport.id });

        if (linkError) throw new Error('Failed to link duplicate: ' + linkError.message);

        setDuplicateInfo({
          ...existingReport,
          duplicate_count: existingReport.duplicate_count + 1,
        });
        setTrackingId(existingReport.tracking_id);
      } else {
        // No duplicate found — create a new report
        const { data: urlData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName);

        const { data, error: insertError } = await supabase
          .from('reports')
          .insert({
            issue_type: issueType,
            description: description.trim() || null,
            photo_url: urlData.publicUrl,
            latitude,
            longitude,
            location_text: locationText || null,
          })
          .select('tracking_id')
          .single();

        if (insertError) throw new Error('Failed to submit report: ' + insertError.message);

        setTrackingId(data.tracking_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (trackingId) {
    const isDuplicate = duplicateInfo !== null;
    const totalCount = isDuplicate ? duplicateInfo!.duplicate_count : 1;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          {isDuplicate ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">This Issue Was Already Reported</h2>
              <p className="text-slate-500 mb-6">
                This issue has already been reported{' '}
                <span className="font-bold text-amber-600">{totalCount} {totalCount === 1 ? 'time' : 'times'}</span>{' '}
                nearby. We've added your report to the existing one so municipal staff can prioritize it.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Submitted!</h2>
              <p className="text-slate-500 mb-6">
                Save your tracking ID to check the status of your report later.
              </p>
            </>
          )}
          <div className={`rounded-xl border-2 border-dashed p-6 mb-6 ${isDuplicate ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-slate-50'}`}>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              {isDuplicate ? 'Existing Tracking ID' : 'Your Tracking ID'}
            </p>
            <p className={`text-3xl font-bold font-mono tracking-wider ${isDuplicate ? 'text-amber-600' : 'text-teal-600'}`}>
              {trackingId}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/track')}
              className={`px-6 py-3 rounded-xl text-white font-medium transition-colors ${isDuplicate ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
              Track This Report
            </button>
            <button
              onClick={() => {
                setTrackingId(null);
                setDuplicateInfo(null);
                setIssueType('');
                setDescription('');
                setPhoto(null);
                setPhotoPreview(null);
                setLatitude(null);
                setLongitude(null);
                setLocationText('');
                setManualLat('');
                setManualLng('');
                setShowManual(false);
              }}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Report a Civic Issue</h1>
        <p className="text-slate-500 mt-1">Help improve your community. Fill out the details below.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Photo of the Issue <span className="text-red-500">*</span>
          </label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-slate-500">Tap to upload a photo</span>
                <span className="text-xs text-slate-400">JPG, PNG up to 10MB</span>
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Issue Type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Issue Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ISSUE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setIssueType(type)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  issueType === type
                    ? 'border-teal-500 bg-teal-50 scale-[1.02]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl">{ISSUE_TYPE_ICONS[type]}</span>
                <span className="text-sm font-medium text-slate-700">{type}</span>
                {issueType === type && (
                  <div className="w-4 h-4 rounded-full bg-teal-500 absolute -top-1 -right-1 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Location <span className="text-slate-400 font-normal">(auto-captured via GPS)</span>
          </label>
          <button
            type="button"
            onClick={captureGPS}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {locating ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Getting your location...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {latitude !== null ? 'Update GPS Location' : 'Capture GPS Location'}
              </>
            )}
          </button>

          {locationError && (
            <p className="mt-2 text-sm text-amber-600">{locationError}</p>
          )}

          {latitude !== null && longitude !== null && (
            <div className="mt-3 p-3 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </span>
              </div>
              {locationText && (
                <p className="text-xs text-slate-500 mt-1 ml-6">{locationText}</p>
              )}
            </div>
          )}

          {showManual && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">Enter coordinates manually:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleManualLocation}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Add any details that might help... (e.g. size of pothole, how long the leak has been there)"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 resize-none"
          />
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-4 rounded-xl bg-teal-600 text-white font-semibold text-lg hover:bg-teal-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Report'
          )}
        </button>
      </form>
    </div>
  );
}
