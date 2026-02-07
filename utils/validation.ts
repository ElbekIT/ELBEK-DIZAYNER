// Input validation and sanitization utilities

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Uzbek phone format: +998 XX XXX XX XX (17 characters exactly)
  const phoneRegex = /^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;
  return phoneRegex.test(phone);
};

export const validateTelegramUsername = (username: string): boolean => {
  // Telegram username must start with @ and contain only letters, numbers, underscores
  const telegramRegex = /^@[a-zA-Z0-9_]{4,32}$/;
  return telegramRegex.test(username);
};

export const validatePromoCode = (code: string): boolean => {
  if (!code || code.trim().length === 0) return false;
  // Promo code should be alphanumeric and underscore only
  const promoRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return promoRegex.test(code);
};

export const sanitizeInput = (input: string, maxLength: number = 100): string => {
  if (!input) return '';
  return (
    input
      .trim()
      // Remove any HTML-like characters
      .replace(/[<>\"'`]/g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Limit length
      .substring(0, maxLength)
  );
};

export const sanitizeMessage = (message: string, maxLength: number = 1000): string => {
  if (!message) return '';
  return (
    message
      .trim()
      // Allow common punctuation but remove potentially dangerous characters
      .replace(/[<>\"'`]/g, '')
      // Remove extra whitespace
      .replace(/\n\n+/g, '\n')
      // Limit length
      .substring(0, maxLength)
  );
};

export const formatPhoneNumber = (input: string): string => {
  // Remove all non-digits except the leading +
  let cleaned = input.replace(/[^\d+]/g, '');

  // Remove multiple + symbols
  if (cleaned.split('+').length > 2) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }

  // Ensure it starts with +998
  if (!cleaned.startsWith('+998')) {
    cleaned = '+998' + cleaned.replace(/^\+?998/, '');
  }

  // Format as +998 XX XXX XX XX
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length <= 3) {
    return '+998';
  } else if (digits.length <= 5) {
    return `+998 ${digits.slice(3)}`;
  } else if (digits.length <= 8) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5)}`;
  } else if (digits.length <= 10) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  } else {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
};

export const validateOrderForm = (formData: {
  firstName: string;
  lastName?: string;
  phone: string;
  telegram: string;
  designTypes: string[];
  game?: string;
  message?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // First name validation
  if (!formData.firstName || formData.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }

  // Phone validation
  if (!validatePhoneNumber(formData.phone)) {
    errors.phone = 'Phone number must be in format: +998 XX XXX XX XX';
  }

  // Telegram validation
  if (!validateTelegramUsername(formData.telegram)) {
    errors.telegram = 'Telegram username must start with @ and be 5-33 characters';
  }

  // Design types validation
  if (!formData.designTypes || formData.designTypes.length === 0) {
    errors.designTypes = 'Please select at least one design type';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
