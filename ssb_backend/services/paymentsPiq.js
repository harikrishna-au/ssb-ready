/**
 * Server-side mirror of the PIQ completeness rules in ssb_web/src/lib/piq.ts.
 * Payment gating must never trust the client's `piqComplete` flag, so we recompute it from the
 * stored answers. KEEP IN SYNC with the web file: required fields, `showIf` rules and validators.
 */

// [key, requiredAlways]. `previousAttemptDetails` is required only when earlier attempts is not "0".
const REQUIRED_KEYS = [
  'fullName', 'dateOfBirth', 'gender', 'phone', 'email', 'placeOfResidence', 'district', 'state',
  'motherTongue', 'maritalStatus',
  'currentStatus', 'tenthPercentage', 'twelfthPercentage', 'twelfthStream',
  'fatherOccupation', 'motherOccupation',
  'gamesSports', 'hobbies',
  'examApplying', 'servicePreference', 'previousAttempts', 'previousAttemptDetails', 'whyJoin'
];

const PERCENT_KEYS = ['tenthPercentage', 'twelfthPercentage', 'graduationPercentage'];

function isVisible(key, values) {
  if (key === 'previousAttemptDetails') return !!values.previousAttempts && values.previousAttempts !== '0';
  return true;
}

/** Returns an error string for a value, or null when fine. `now` is injectable for tests. */
function validateField(key, raw, required, now = () => new Date()) {
  const v = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim();
  if (!v) return required ? 'required' : null;
  if (key === 'phone') {
    const digits = v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)/, '');
    return /^[6-9]\d{9}$/.test(digits) ? null : 'invalid';
  }
  if (key === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'invalid';
  if (key === 'dateOfBirth') {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return 'invalid';
    const age = (now().getTime() - d.getTime()) / 31_557_600_000;
    return age >= 14 && age <= 45 ? null : 'invalid';
  }
  if (key === 'pincode') return /^\d{6}$/.test(v) ? null : 'invalid';
  if (PERCENT_KEYS.includes(key)) {
    const n = Number(v.replace('%', ''));
    return Number.isFinite(n) && n >= 0 && n <= 100 ? null : 'invalid';
  }
  if (key === 'whyJoin') return v.length >= 30 ? null : 'invalid';
  return v.length <= 1000 ? null : 'invalid';
}

function piqCompleteness(values, now) {
  const data = values && typeof values === 'object' ? values : {};
  const required = REQUIRED_KEYS.filter((k) => isVisible(k, data));
  const missing = required.filter((k) => validateField(k, data[k], true, now) !== null);
  // Like the web: only required fields decide completeness (optional ones are not checked here).
  return { complete: missing.length === 0, done: required.length - missing.length, total: required.length, missing };
}

module.exports = { piqCompleteness, REQUIRED_KEYS };
