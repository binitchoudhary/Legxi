// Last-10-digit phone normalization handles +91/0 prefix variants.
export const phone10 = p => (p || '').replace(/\D/g, '').slice(-10);
