// utils/validationUtils.ts

export const isValidEmail = (email: string): boolean => {
  // Basic email regex from HTML5 spec
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
};

export const isValidPin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};
