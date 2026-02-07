# ElbekDesign - Development Setup Guide

## Initial Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your values:
```env
# Get these from BotFather on Telegram
VITE_TELEGRAM_BOT_TOKEN=your_actual_bot_token
VITE_TELEGRAM_ADMIN_ID=your_actual_admin_id
```

**Never commit `.env.local` to version control!**

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Important Security Notes

### API Keys & Secrets
- **NEVER** hardcode API keys in source code
- **NEVER** commit `.env.local` to Git
- **ALWAYS** use environment variables for secrets
- **ALWAYS** use `.env.example` to document required variables

### Firebase Configuration
The Firebase config in `firebase.ts` is semi-public (frontend config is always public). Focus security on:
- Database security rules (RLS)
- Authentication permissions
- Input validation & sanitization

### Telegram Bot Token
- Keep it absolutely secret
- Regenerate if you suspect it's compromised
- Never share in bug reports or logs

---

## Using New Validation Utilities

### Import
```typescript
import {
  validatePhoneNumber,
  validateTelegramUsername,
  sanitizeInput,
  formatPhoneNumber,
  validateOrderForm
} from '@/utils/validation';
```

### Examples

**Phone Number Formatting:**
```typescript
const phone = formatPhoneNumber("+998901234567");
// Returns: "+998 90 123 45 67"
```

**Input Sanitization:**
```typescript
const safe = sanitizeInput(userInput);
// Removes: HTML tags, special chars, limits to 100 chars
```

**Form Validation:**
```typescript
const { isValid, errors } = validateOrderForm({
  firstName: "John",
  phone: "+998 90 123 45 67",
  telegram: "@username",
  designTypes: ["Banner"],
  game: "Minecraft"
});

if (!isValid) {
  console.log("Errors:", errors);
  // { phone: "Phone number must be...", ... }
}
```

---

## Using Error Handler

### Import
```typescript
import {
  AppError,
  getFirebaseErrorMessage,
  getOrderSubmissionError,
  logError
} from '@/utils/errorHandler';
```

### Examples

**Logging Errors:**
```typescript
try {
  await someFirebaseOperation();
} catch (error) {
  logError(error, 'ORDER_SUBMISSION');
  // Logs with timestamp and context
}
```

**User-Friendly Messages:**
```typescript
try {
  await submitOrder(data);
} catch (error) {
  const userMessage = getFirebaseErrorMessage(error);
  alert(userMessage); // "Network error. Please check..."
}
```

**Order Submission with Retry Logic:**
```typescript
try {
  await submitOrder(formData);
  setSuccess(true);
} catch (error) {
  const { userMessage, canRetry } = getOrderSubmissionError(error);
  
  if (canRetry) {
    setError(userMessage); // Show "Try again" button
  } else {
    setFatalError(userMessage); // Show "Contact support" button
  }
}
```

---

## Firebase Realtime Database Structure

```
/
├── orders/
│   ├── ORDER_ID_1/
│   │   ├── id: string
│   │   ├── userId: string
│   │   ├── firstName: string
│   │   ├── phone: string
│   │   ├── designTypes: string[]
│   │   ├── totalPrice: number
│   │   ├── status: string (CHECKING, CHECKED, APPROVED, etc.)
│   │   └── createdAt: ISO string
│   └── ORDER_ID_2/
│       └── ...
├── users/
│   ├── USER_UID_1/
│   │   ├── email: string
│   │   ├── displayName: string
│   │   ├── isBlocked: boolean
│   │   ├── blockedAt: ISO string
│   │   └── blockedReason: string
│   └── USER_UID_2/
│       └── ...
├── portfolio/
│   ├── DESIGN_ID_1/
│   │   ├── title: string
│   │   ├── image: base64 string
│   │   └── type: string
│   └── DESIGN_ID_2/
│       └── ...
├── notifications/
│   ├── global/
│   │   ├── NOTIF_ID_1/
│   │   │   ├── message: string
│   │   │   ├── type: 'global'
│   │   │   └── createdAt: ISO string
│   │   └── NOTIF_ID_2/
│   │       └── ...
│   └── private/
│       ├── USER_UID_1/
│       │   ├── NOTIF_ID_1/
│       │   │   ├── message: string
│       │   │   ├── type: 'private'
│       │   │   └── createdAt: ISO string
│       │   └── NOTIF_ID_2/
│       │       └── ...
│       └── USER_UID_2/
│           └── ...
└── blockedUsers/
    ├── USER_UID_1: true
    └── USER_UID_2: true
```

---

## Key Files & Their Purposes

| File | Purpose |
|------|---------|
| `App.tsx` | Main app component (needs refactoring) |
| `firebase.ts` | Firebase initialization & auth |
| `constants.ts` | App-wide constants (uses env vars) |
| `types.ts` | TypeScript type definitions |
| `translations.ts` | Multilingual text content |
| `utils/validation.ts` | Form validation & sanitization |
| `utils/errorHandler.ts` | Error handling utilities |
| `services/telegramService.ts` | Telegram bot integration |
| `.env.example` | Environment variables template |
| `IMPROVEMENTS.md` | Detailed improvement documentation |
| `SETUP.md` | This file |

---

## Common Development Tasks

### Add New Form Validation

1. Add to `utils/validation.ts`:
```typescript
export const validateNewField = (value: string): boolean => {
  const regex = /pattern/;
  return regex.test(value);
};
```

2. Use in component:
```typescript
import { validateNewField } from '@/utils/validation';

if (!validateNewField(value)) {
  setError('Invalid input');
}
```

### Add Error Message Handling

1. Add to `utils/errorHandler.ts`:
```typescript
export const getNewError = (error: any): string => {
  if (error.code === 'SPECIFIC_CODE') {
    return 'User-friendly message';
  }
  return 'Default message';
};
```

2. Use in component:
```typescript
import { getNewError, logError } from '@/utils/errorHandler';

try {
  // operation
} catch (error) {
  logError(error, 'CONTEXT');
  const message = getNewError(error);
  alert(message);
}
```

### Add New Translation

1. Add to all 3 language objects in `translations.ts`:
```typescript
export const translations = {
  'uz-Latn': {
    mySection: {
      myKey: 'Uzbek Latin text'
    },
    // ...
  },
  'uz-Cyrl': {
    mySection: {
      myKey: 'Uzbek Cyrillic text'
    },
    // ...
  },
  'ru': {
    mySection: {
      myKey: 'Russian text'
    },
    // ...
  }
};
```

2. Use in component:
```typescript
const { t } = useTranslation();
<p>{t.mySection.myKey}</p>
```

---

## Testing

### Run Tests
```bash
npm run test
```

### Add Test
Create file: `__tests__/myfeature.test.ts`
```typescript
import { validatePhone } from '@/utils/validation';

describe('Phone Validation', () => {
  test('accepts valid Uzbek phone', () => {
    expect(validatePhone('+998 90 123 45 67')).toBe(true);
  });
  
  test('rejects invalid phone', () => {
    expect(validatePhone('invalid')).toBe(false);
  });
});
```

---

## Debugging

### Enable Debug Logs
```typescript
// In components
console.log("[v0] Variable value:", value);
console.log("[v0] Firebase response:", data);
console.log("[v0] Error occurred:", error);
```

### Check Browser Console
Press `F12` to open Developer Tools → Console tab

### Check Network Requests
Developer Tools → Network tab:
- Firebase requests to `firebaseio.com`
- Telegram requests to `api.telegram.org`

### Check Realtime Database
- Go to Firebase Console
- Select your project
- Check "Realtime Database" tab
- Monitor data changes in real-time

---

## Troubleshooting

### Issue: Telegram notifications not received
**Solution:**
1. Check `.env.local` has correct bot token
2. Check bot token is in format: `123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh`
3. Check admin ID is your personal Telegram user ID (find with @userinfobot)
4. Check browser console for Telegram API errors

### Issue: Orders not saving to Firebase
**Solution:**
1. Check internet connection
2. Check Firebase configuration in `firebase.ts`
3. Check Firebase project is active
4. Check database rules allow write operations
5. Check browser console for Firebase errors

### Issue: Form validation errors not showing
**Solution:**
1. Import validation functions correctly
2. Call them BEFORE database operations
3. Check error messages in component state
4. Display errors to user before submitting

### Issue: Payment disclaimer not showing
**Solution:**
1. Check translations have updated `paymentImportant` key
2. Check component renders payment step (step === 5)
3. Check CSS class names are correct
4. Check browser console for React errors

---

## Performance Tips

### Optimize Re-renders
```typescript
// Use React.memo for components that receive same props
const MyComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// Use useMemo for expensive computations
const total = useMemo(() => {
  return orders.reduce((sum, o) => sum + o.price, 0);
}, [orders]);
```

### Lazy Load Components
```typescript
const AdminPanel = lazy(() => import('./AdminPanel'));
const PortfolioPage = lazy(() => import('./PortfolioPage'));
```

### Optimize Firebase Listeners
- Unsubscribe from listeners when component unmounts
- Use separate useEffect hooks (don't nest listeners)
- Limit database path depth

---

## Deployment

### Build for Production
```bash
npm run build
```

This creates optimized build in `dist/` folder.

### Deploy to Vercel
```bash
vercel deploy
```

Or connect GitHub repo to Vercel for automatic deployments.

### Environment Variables in Production
1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. Add `VITE_TELEGRAM_BOT_TOKEN` and `VITE_TELEGRAM_ADMIN_ID`
4. Redeploy for changes to take effect

---

## Resources

- [Firebase Docs](https://firebase.google.com/docs)
- [React Docs](https://react.dev)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Vite Docs](https://vitejs.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

---

**Last Updated:** 2024
**Version:** 2.0 (Post-Improvements)
