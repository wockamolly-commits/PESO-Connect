import React, { useMemo } from 'react';
import { Phone, Mail } from 'lucide-react';
import psgcData from '../../data/psgc.json';

export default function Step3AddressContact({ formData, handleChange, setFormData }) {
  const provinces = useMemo(() => psgcData.map(p => p.name).sort(), []);

  const cities = useMemo(() => {
    if (!formData.province) return [];
    const prov = psgcData.find(p => p.name === formData.province);
    return prov ? prov.cities.map(c => c.name).sort() : [];
  }, [formData.province]);

  const barangays = useMemo(() => {
    if (!formData.province || !formData.city) return [];
    const prov = psgcData.find(p => p.name === formData.province);
    if (!prov) return [];
    const city = prov.cities.find(c => c.name === formData.city);
    return city ? city.barangays.sort() : [];
  }, [formData.province, formData.city]);

  const handleProvinceChange = (e) => {
    setFormData(prev => ({
      ...prev,
      province: e.target.value,
      city: '',
      barangay: ''
    }));
  };

  const handleCityChange = (e) => {
    setFormData(prev => ({
      ...prev,
      city: e.target.value,
      barangay: ''
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Address & Contact</h2>
        <p className="text-sm text-gray-400 mt-1">Your current address and contact details</p>
      </div>

      {/* House/Street */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          House No. / Street / Village <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="house_street"
          value={formData.house_street || ''}
          onChange={handleChange}
          placeholder="e.g. 123 Rizal Street, Brgy. Centro"
          className="input-field w-full"
        />
      </div>

      {/* Province */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Province <span className="text-red-500">*</span>
        </label>
        <select
          name="province"
          value={formData.province || ''}
          onChange={handleProvinceChange}
          className="input-field w-full"
        >
          <option value="">Select province...</option>
          {provinces.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* City/Municipality */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          City / Municipality <span className="text-red-500">*</span>
        </label>
        <select
          name="city"
          value={formData.city || ''}
          onChange={handleCityChange}
          disabled={!formData.province}
          className={`input-field w-full ${!formData.province ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{formData.province ? 'Select city...' : 'Select province first'}</option>
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Barangay */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Barangay <span className="text-red-500">*</span>
        </label>
        <select
          name="barangay"
          value={formData.barangay || ''}
          onChange={handleChange}
          disabled={!formData.city}
          className={`input-field w-full ${!formData.city ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{formData.city ? 'Select barangay...' : 'Select city first'}</option>
          {barangays.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Contact Number */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Contact Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            name="mobile_number"
            value={formData.mobile_number || ''}
            onChange={handleChange}
            placeholder="09XX XXX XXXX"
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={formData.email || ''}
            readOnly
            className="input-field w-full pl-10 bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">From your account credentials</p>
      </div>
    </div>
  );
}
