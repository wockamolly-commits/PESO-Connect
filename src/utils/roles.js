// Role constants and helpers for the two-level role system.
//
// PROFILE_TABLES uses mixed keys intentionally:
//   - ROLES.EMPLOYER maps directly (employer has no subtype)
//   - SUBTYPES.JOBSEEKER / SUBTYPES.HOMEOWNER map by subtype value
// This allows getProfileTable() to resolve the correct table using
// role for employers and subtype for users. The key distinction is
// abstracted by the helper functions — consumers should always use
// getProfileTable(role, subtype) rather than accessing the map directly.

export const ROLES = {
  EMPLOYER: 'employer',
  USER: 'user',
  ADMIN: 'admin',
};

export const SUBTYPES = {
  JOBSEEKER: 'jobseeker',
  HOMEOWNER: 'homeowner',
};

export const PROFILE_TABLES = {
  [ROLES.EMPLOYER]: 'employer_profiles',
  [SUBTYPES.JOBSEEKER]: 'jobseeker_profiles',
  [SUBTYPES.HOMEOWNER]: 'homeowner_profiles',
};

export const getProfileTable = (role, subtype) => {
  if (role === ROLES.EMPLOYER) return PROFILE_TABLES[ROLES.EMPLOYER];
  if (role === ROLES.USER) return PROFILE_TABLES[subtype];
  return null;
};

export const STATUS_FIELDS = {
  [ROLES.EMPLOYER]: 'employer_status',
  [SUBTYPES.JOBSEEKER]: 'jobseeker_status',
  [SUBTYPES.HOMEOWNER]: 'homeowner_status',
};

export const getStatusField = (role, subtype) => {
  if (role === ROLES.EMPLOYER) return STATUS_FIELDS[ROLES.EMPLOYER];
  if (role === ROLES.USER) return STATUS_FIELDS[subtype];
  return null;
};

export const getRegistrationRoute = (role, subtype) => {
  if (role === ROLES.EMPLOYER) return '/register/employer';
  if (subtype === SUBTYPES.JOBSEEKER) return '/register/jobseeker';
  if (subtype === SUBTYPES.HOMEOWNER) return '/register/homeowner';
  return '/register';
};
