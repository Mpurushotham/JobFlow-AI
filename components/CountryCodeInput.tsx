import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { countryData, CountryData } from '../utils/countryData'; // Import comprehensive country data

interface CountryCodeInputProps {
  value: string; // Expected format: "+[countryCode][phoneNumber]" or just "[phoneNumber]"
  onChange: (fullPhoneNumber: string, isValid: boolean) => void;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void; // FIX: Changed onBlur prop type
  error?: string | null;
}

const isValidPhoneNumber = (phoneNumber: string): boolean => {
  // Basic validation: must be digits, optional +, min 7 digits (global standard approximation)
  return /^\+?[0-9]{7,15}$/.test(phoneNumber);
};

export const CountryCodeInput: React.FC<CountryCodeInputProps> = ({ value, onChange, disabled, onBlur, error }) => {
  const [selectedCode, setSelectedCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      // Try to find a matching country code from the comprehensive list
      const matchingCountry = countryData.find(c => value.startsWith(c.dial_code));
      if (matchingCountry) {
        setSelectedCode(matchingCountry.dial_code);
        setPhoneNumber(value.substring(matchingCountry.dial_code.length));
      } else {
        // If no matching code, try to parse a potential dial code if present (e.g., for custom numbers not in list)
        const potentialCodeMatch = value.match(/^\+(\d{1,4})/);
        if (potentialCodeMatch) {
            setSelectedCode(`+${potentialCodeMatch[1]}`);
            setPhoneNumber(value.substring(potentialCodeMatch[0].length));
        } else {
            setSelectedCode('+1'); // Default if no code found
            setPhoneNumber(value);
        }
      }
    } else {
      setSelectedCode('+1'); // Default to +1 if value is empty
      setPhoneNumber('');
    }
  }, [value]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setSelectedCode(newCode);
    const fullNumber = newCode + phoneNumber;
    const valid = isValidPhoneNumber(fullNumber);
    onChange(fullNumber, valid);
    setInternalError(valid || phoneNumber === '' ? null : 'Invalid phone number format.');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    setPhoneNumber(newNumber);
    const fullNumber = selectedCode + newNumber;
    const valid = isValidPhoneNumber(fullNumber);
    onChange(fullNumber, valid);
    setInternalError(valid || newNumber === '' ? null : 'Invalid phone number format.');
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { // FIX: Changed signature to accept event object
    const fullNumber = selectedCode + phoneNumber;
    const valid = isValidPhoneNumber(fullNumber);
    if (!valid && phoneNumber.trim() !== '') {
      setInternalError('Invalid phone number format.');
    } else {
      setInternalError(null);
    }
    if (onBlur) onBlur(e); // Pass the event object to parent's onBlur
  };

  const displayError = error || internalError;

  return (
    <div>
      <div className="relative flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 outline-none transition-all">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Phone size={18} />
        </span>
        <select
          value={selectedCode}
          onChange={handleCodeChange}
          disabled={disabled}
          onBlur={handleBlur}
          className="bg-transparent pl-12 pr-2 py-3 text-gray-900 dark:text-white font-medium outline-none border-r border-gray-200 dark:border-slate-700 rounded-l-xl cursor-pointer"
          style={{ width: 'auto', maxWidth: '140px' }} // Adjust width for flag and code
        >
          {countryData.map((c: CountryData) => (
            <option key={c.code} value={c.dial_code}>
              {c.flag} {c.dial_code} ({c.code})
            </option>
          ))}
          {/* Ensure currently selected custom code is an option if not in default list */}
          {!countryData.some(c => c.dial_code === selectedCode) && selectedCode !== '+1' && (
            <option value={selectedCode}>{selectedCode}</option>
          )}
        </select>
        <input
          type="tel"
          value={phoneNumber}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="flex-1 bg-transparent p-3 text-gray-900 dark:text-white font-medium outline-none rounded-r-xl"
          placeholder="e.g. 555 123 4567"
        />
      </div>
      {displayError && phoneNumber.trim() !== '' && (
        <p className="mt-1 text-xs text-red-500">{displayError}</p>
      )}
    </div>
  );
};