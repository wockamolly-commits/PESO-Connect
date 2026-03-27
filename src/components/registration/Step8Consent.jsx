import React from 'react';
import { ShieldCheck } from 'lucide-react';

const CONSENT_ITEMS = [
  {
    field: 'terms_accepted',
    label: 'Terms and Conditions',
    description: 'I certify that all data/information I have provided in this form are true to the best of my knowledge. This is also to authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf.'
  },
  {
    field: 'data_processing_consent',
    label: 'Data Processing Consent',
    description: 'I consent to the collection, processing, and storage of my personal data in accordance with the Data Privacy Act of 2012 (RA 10173).'
  },
  {
    field: 'peso_verification_consent',
    label: 'PESO Verification',
    description: 'I understand that my registration is subject to verification by the Public Employment Service Office (PESO) and my profile will remain pending until verified.'
  }
];

export default function Step7Consent({ formData, setFormData }) {

  const toggleConsent = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const displayName = [formData.first_name, formData.middle_name, formData.surname]
    .filter(Boolean).join(' ');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Almost done!</h2>
        <p className="text-sm text-gray-400 mt-1">Please review and accept the following to complete your registration</p>
      </div>

      {/* Consent checkboxes */}
      <div className="space-y-3">
        {CONSENT_ITEMS.map(item => (
          <label
            key={item.field}
            className={`flex gap-3 p-4 rounded-xl border-[1.5px] cursor-pointer transition-all ${
              formData[item.field]
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleConsent(item.field)}
              className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs transition-all ${
                formData[item.field]
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-gray-300'
              }`}
            >
              {formData[item.field] && '✓'}
            </button>
            <div>
              <span className="text-sm font-semibold text-gray-800">{item.label} <span className="text-red-500">*</span></span>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Registration Summary */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Registration Summary</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 shrink-0">Name</span>
          <span className="font-medium text-gray-800 text-right">{displayName || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 shrink-0">Email</span>
          <span className="font-medium text-gray-800 text-right break-all">{formData.email || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 shrink-0">Location</span>
          <span className="font-medium text-gray-800 text-right">
            {[formData.barangay, formData.city, formData.province].filter(Boolean).join(', ') || '—'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 shrink-0">Education</span>
          <span className="font-medium text-gray-800 text-right">{formData.highest_education || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 shrink-0">Status</span>
          <span className="font-medium text-gray-800 text-right capitalize">{formData.employment_status || '—'}</span>
        </div>
      </div>

      {/* Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Important</p>
            <p className="text-xs text-amber-700 mt-1">
              Your registration will be reviewed and verified by PESO staff. Your account will remain in "pending" status until verification is complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
