// Error handling and user-friendly error messages

export class AppError extends Error {
  constructor(
    public message: string,
    public userMessage: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const getFirebaseErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || 'Unknown error occurred';

  const errorMap: Record<string, string> = {
    'auth/popup-closed-by-user': 'You closed the login popup. Please try again.',
    'auth/popup-blocked': 'Browser blocked the login popup. Please allow popups and try again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/operation-not-allowed': 'Google sign-in is not enabled. Please contact support.',
    'PERMISSION_DENIED': 'You do not have permission to perform this action.',
    'ENOTFOUND': 'Cannot reach the server. Please check your internet connection.',
    'CORS': 'Cross-origin request failed. Please try again later.',
  };

  // Check if error code matches
  for (const [key, value] of Object.entries(errorMap)) {
    if (code.includes(key) || message.includes(key)) {
      return value;
    }
  }

  // Default message based on error type
  if (code.includes('auth')) {
    return 'Authentication failed. Please try signing in again.';
  }
  if (code.includes('database') || code.includes('permission')) {
    return 'Could not save your data. Please try again later.';
  }
  if (code.includes('network')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  return 'Something went wrong. Please try again later.';
};

export const getTelegramErrorMessage = (error: any): string => {
  const message = error?.message || 'Unknown error';

  if (message.includes('network')) {
    return 'Could not send notification to Telegram. Your order was saved, but the designer may not be notified immediately.';
  }
  if (message.includes('401') || message.includes('Unauthorized')) {
    return 'Telegram bot configuration error. Please contact support.';
  }
  if (message.includes('timeout')) {
    return 'Request timeout. Please try submitting your order again.';
  }

  return 'Could not send notification to Telegram. Your order was saved, but the designer may not be notified immediately.';
};

export const getOrderSubmissionError = (error: any): {
  userMessage: string;
  canRetry: boolean;
} => {
  const code = error?.code || '';
  const message = error?.message || '';

  // Network errors - user should retry
  if (message.includes('network') || message.includes('timeout') || message.includes('ENOTFOUND')) {
    return {
      userMessage:
        'Network error. Please check your internet connection and try again.',
      canRetry: true,
    };
  }

  // Permission errors - user should not retry
  if (message.includes('permission') || code.includes('PERMISSION_DENIED')) {
    return {
      userMessage:
        'You do not have permission to submit orders. Please contact support.',
      canRetry: false,
    };
  }

  // Database errors - could be temporary
  if (code.includes('database')) {
    return {
      userMessage: 'Could not save your order. Please check your connection and try again.',
      canRetry: true,
    };
  }

  // Unknown errors - suggest retry
  return {
    userMessage: 'Something went wrong while submitting your order. Please try again.',
    canRetry: true,
  };
};

export const logError = (error: any, context: string = '') => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: error?.message || 'Unknown error',
    code: error?.code || 'UNKNOWN',
    stack: error?.stack || 'No stack trace',
  };

  console.error(`[${context}]`, errorInfo);

  // In production, you could send this to a logging service
  // For now, just log to console
};
