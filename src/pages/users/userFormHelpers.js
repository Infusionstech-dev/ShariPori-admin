import { z } from 'zod';

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

// Shows API field errors on the form. Returns false when there were none to show.
export const applyServerErrors = (err, setError) => {
  const details = Array.isArray(err?.data?.details) ? err.data.details : [];
  details.forEach(({ field, message }) => setError(field, { message }));
  return details.length > 0;
};
