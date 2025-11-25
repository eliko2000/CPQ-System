# Error Handling System

## Overview

The CPQ system implements a comprehensive error handling pattern that provides:

- Consistent error classification and logging
- User-friendly error messages (Hebrew)
- React error boundaries to prevent app crashes
- Integration with toast notifications
- Automatic retry with exponential backoff

## Architecture

```
Error Occurs
     ↓
handleError() → classifyError() → Categorize (Network, DB, Validation, etc.)
     ↓                  ↓
logError()        formatErrorForUser()
     ↓                  ↓
  Logger           Toast Notification
```

## Quick Start

### 1. Use the Hook in Components

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, handleSuccess, handleWarning } = useErrorHandler();

  const saveData = async () => {
    try {
      await api.save(data);
      handleSuccess('נשמר בהצלחה');
    } catch (error) {
      handleError(error, {
        toastMessage: 'שגיאה בשמירה',
        context: { dataId: data.id },
      });
    }
  };
}
```

### 2. Wrap Components with Error Boundaries

```typescript
import { SectionErrorBoundary } from '@/components/error/ErrorBoundary'

function MyPage() {
  return (
    <SectionErrorBoundary>
      <MyComponent />
    </SectionErrorBoundary>
  )
}
```

### 3. Use Async Handler for Complex Operations

```typescript
import { useAsyncHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { executeAsync } = useAsyncHandler();

  const loadData = async () => {
    const { data, error } = await executeAsync(() => api.fetchData(), {
      successMessage: { title: 'נטען בהצלחה' },
      errorMessage: 'שגיאה בטעינה',
    });

    if (data) {
      // Use data
    }
  };
}
```

## Error Categories

The system automatically classifies errors into categories:

| Category          | Description                 | Examples                               |
| ----------------- | --------------------------- | -------------------------------------- |
| `VALIDATION`      | Invalid input data          | Required field missing, invalid format |
| `NETWORK`         | Network/connectivity issues | Timeout, fetch failed, no connection   |
| `DATABASE`        | Database operations         | Query failed, constraint violation     |
| `AUTHENTICATION`  | Auth issues                 | Token expired, unauthorized            |
| `AUTHORIZATION`   | Permission issues           | Forbidden, access denied               |
| `FILE_PROCESSING` | File operations             | Parse failed, invalid format           |
| `CALCULATION`     | Math/calculation errors     | Divide by zero, overflow               |
| `UNKNOWN`         | Uncategorized errors        | General errors                         |

## Error Severity Levels

| Severity   | Duration | User Impact                | Example                   |
| ---------- | -------- | -------------------------- | ------------------------- |
| `LOW`      | 4s       | Minor inconvenience        | Optional field validation |
| `MEDIUM`   | 6s       | Feature not working        | File upload failed        |
| `HIGH`     | 8s       | Major functionality broken | Database save failed      |
| `CRITICAL` | 10s      | App-breaking               | Authentication failed     |

## API Reference

### `useErrorHandler()`

Main hook for error handling in React components.

#### Methods

**`handleError(error, options)`**

- `error`: The error object (any type)
- `options`:
  - `showToast`: Show toast notification (default: true)
  - `toastTitle`: Custom toast title
  - `toastMessage`: Custom toast message
  - `context`: Additional context for logging
  - `onError`: Callback after error handling

**`handleSuccess(title, message?)`**

- Show success toast

**`handleWarning(title, message?)`**

- Show warning toast

**`handleInfo(title, message?)`**

- Show info toast

**`wrapAsync(fn, options)`**

- Wrap async function with automatic error handling

### `useAsyncHandler()`

Simplified hook for async operations with loading state.

#### Methods

**`executeAsync(asyncFn, options)`**

- `asyncFn`: Async function to execute
- `options`:
  - `successMessage`: Success toast config
  - `errorMessage`: Custom error message
  - `onSuccess`: Success callback
  - `onError`: Error callback

Returns: `{ data?, error? }`

### Error Boundaries

#### `<ErrorBoundary>`

Full-page error boundary. Shows full-screen error UI.

```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### `<SectionErrorBoundary>`

Section-level error boundary. Shows inline error UI.

```typescript
<SectionErrorBoundary>
  <MySection />
</SectionErrorBoundary>
```

#### `withErrorBoundary(Component, fallback?)`

HOC to wrap component with error boundary.

```typescript
export default withErrorBoundary(MyComponent);
```

### Core Utilities

Located in `src/lib/errorHandling.ts`:

#### `createAppError(error, context?)`

Create standardized AppError object from any error.

#### `handleError(error, context?)`

Process error with logging and classification.

#### `formatErrorForUser(error, customMessage?)`

Format error for user display.

#### `retryWithBackoff(fn, maxRetries?, initialDelay?)`

Retry async function with exponential backoff.

```typescript
const result = await retryWithBackoff(
  () => api.fetchData(),
  3, // max retries
  1000 // initial delay in ms
);
```

## Best Practices

### ✅ DO

1. **Use the hook in all components**

```typescript
const { handleError } = useErrorHandler();
```

2. **Provide context for debugging**

```typescript
handleError(error, {
  context: { userId, componentId, operation: 'save' },
});
```

3. **Use error boundaries for sections**

```typescript
<SectionErrorBoundary>
  <ComplexComponent />
</SectionErrorBoundary>
```

4. **Show success messages**

```typescript
handleSuccess('הפעולה הושלמה בהצלחה');
```

5. **Use specific error messages**

```typescript
handleError(error, {
  toastMessage: 'שגיאה בשמירת הרכיב',
});
```

### ❌ DON'T

1. **Don't use alert()**

```typescript
// ❌ Bad
alert('Error: ' + error.message);

// ✅ Good
handleError(error);
```

2. **Don't show technical errors to users**

```typescript
// ❌ Bad
toast.error(error.stack);

// ✅ Good
handleError(error); // Shows user-friendly message
```

3. **Don't catch and ignore errors silently**

```typescript
// ❌ Bad
try {
  await save();
} catch (error) {
  logger.error(error); // User doesn't know it failed!
}

// ✅ Good
try {
  await save();
  handleSuccess('נשמר בהצלחה');
} catch (error) {
  handleError(error); // User sees toast + logged
}
```

4. **Don't throw errors from error handlers**

```typescript
// ❌ Bad
handleError(error);
throw error; // Will trigger error boundary unnecessarily

// ✅ Good
handleError(error);
return; // Let user retry
```

## Migration Guide

### Replacing `alert()`

**Before:**

```typescript
if (!isValid) {
  alert('נא למלא את כל השדות');
  return;
}
```

**After:**

```typescript
const { handleWarning } = useErrorHandler();

if (!isValid) {
  handleWarning('שדות חסרים', 'נא למלא את כל השדות');
  return;
}
```

### Replacing Raw `catch` Blocks

**Before:**

```typescript
try {
  await save();
} catch (err) {
  logger.error('Save failed:', err);
  toast.error('שגיאה בשמירה');
}
```

**After:**

```typescript
const { handleError, handleSuccess } = useErrorHandler();

try {
  await save();
  handleSuccess('נשמר בהצלחה');
} catch (error) {
  handleError(error, { toastMessage: 'שגיאה בשמירה' });
}
```

### Adding Error Boundaries

**Before:**

```typescript
function App() {
  return <MyComponent />
}
```

**After:**

```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  )
}
```

## Testing

### Testing Error Handling

```typescript
import { renderHook } from '@testing-library/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

test('handleError shows toast', () => {
  const { result } = renderHook(() => useErrorHandler());

  const error = new Error('Test error');
  result.current.handleError(error);

  // Assert toast was shown
});
```

### Testing Error Boundaries

```typescript
import { render } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

const ThrowError = () => {
  throw new Error('Test error')
}

test('error boundary catches errors', () => {
  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )

  expect(getByText('משהו השתבש')).toBeInTheDocument()
})
```

## Troubleshooting

### Toast Not Showing

- Ensure `ToastProvider` wraps your app
- Check toast context is available

### Error Boundary Not Catching

- Error boundaries only catch rendering errors
- They don't catch:
  - Event handlers (use try-catch)
  - Async code (use try-catch)
  - Server-side rendering errors

### Errors Not Logged

- Check logger configuration
- Ensure `handleError` is called
- Check browser console

## Examples

### Complete Component Example

```typescript
import { useState } from 'react'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { SectionErrorBoundary } from '@/components/error/ErrorBoundary'
import { Button } from '@/components/ui/button'

function ComponentEditor() {
  const { handleError, handleSuccess, handleWarning } = useErrorHandler()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await api.fetch()
      setData(response)
      handleSuccess('נטען בהצלחה')
    } catch (error) {
      handleError(error, {
        toastMessage: 'שגיאה בטעינת נתונים',
        context: { component: 'ComponentEditor' }
      })
    } finally {
      setLoading(false)
    }
  }

  const saveData = async () => {
    if (!validate(data)) {
      handleWarning('שדות חסרים', 'נא למלא את כל השדות')
      return
    }

    setLoading(true)
    try {
      await api.save(data)
      handleSuccess('נשמר בהצלחה')
    } catch (error) {
      handleError(error, {
        toastMessage: 'שגיאה בשמירה',
        context: { dataId: data.id }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionErrorBoundary>
      <div>
        <Button onClick={loadData} disabled={loading}>
          טען נתונים
        </Button>
        <Button onClick={saveData} disabled={loading || !data}>
          שמור
        </Button>
      </div>
    </SectionErrorBoundary>
  )
}
```
