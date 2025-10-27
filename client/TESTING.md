# Testing Guide

## Overview

This project uses **Vitest** as the testing framework along with **React Testing Library** for component testing.

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode (auto-reruns on file changes)
```bash
npm run test:watch
```

### Run tests with UI interface
```bash
npm run test:ui
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test File Structure

Tests are placed next to the files they test with a `.test.js` or `.test.jsx` extension:

```
src/
├── utils/
│   ├── api.js
│   ├── api.test.js          ← Test for api.js
│   └── mockData.js
│       └── mockData.test.js  ← Test for mockData.js
├── components/
│   ├── LoginRequiredModal.jsx
│   └── LoginRequiredModal.test.jsx
└── context/
    ├── SelectionContext.jsx
    └── SelectionContext.test.jsx
```

## Writing Tests

### Basic Test Structure

```javascript
import { describe, test, expect } from 'vitest';

describe('MyFunction', () => {
  test('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Testing React Components

```javascript
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText(/hello/i)).toBeInTheDocument();
  });
});
```

### Testing with User Interactions

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import MyButton from './MyButton';

describe('MyButton', () => {
  test('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<MyButton onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking API Calls

```javascript
import { vi } from 'vitest';
import api from './api';

// Mock the entire module
vi.mock('./api');

describe('Component with API', () => {
  test('fetches data', async () => {
    // Setup mock
    api.getData.mockResolvedValue({ data: 'test' });
    
    // Your test code here
  });
});
```

## Available Matchers

Vitest includes Jest-compatible matchers:

- `expect(value).toBe(expected)` - Strict equality
- `expect(value).toEqual(expected)` - Deep equality
- `expect(value).toBeTruthy()` - Truthy check
- `expect(value).toBeFalsy()` - Falsy check
- `expect(array).toContain(item)` - Array contains
- `expect(fn).toHaveBeenCalled()` - Function was called
- `expect(fn).toHaveBeenCalledWith(arg)` - Function called with args

React Testing Library matchers (from @testing-library/jest-dom):

- `expect(element).toBeInTheDocument()` - Element exists in DOM
- `expect(element).toBeVisible()` - Element is visible
- `expect(element).toHaveTextContent(text)` - Element has text
- `expect(input).toHaveValue(value)` - Input has value
- `expect(element).toBeDisabled()` - Element is disabled

## Coverage Reports

After running `npm run test:coverage`, open `coverage/index.html` in your browser to see a detailed coverage report.

Aim for:
- **80%+ overall coverage**
- **100% coverage for critical utility functions**
- **Focus on user-facing features**

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **One assertion per test** - Keep tests focused and simple
3. **Use descriptive test names** - Clearly state what is being tested
4. **Arrange-Act-Assert pattern**:
   ```javascript
   test('adds two numbers', () => {
     // Arrange
     const a = 2;
     const b = 3;
     
     // Act
     const result = add(a, b);
     
     // Assert
     expect(result).toBe(5);
   });
   ```
5. **Clean up after tests** - The setup file handles this automatically
6. **Mock external dependencies** - Don't make real API calls or use real localStorage
7. **Test edge cases** - Empty inputs, null values, errors, etc.

## Example: Complete Test File

```javascript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  test('renders with initial state', () => {
    render(<MyComponent />);
    expect(screen.getByText(/initial/i)).toBeInTheDocument();
  });

  test('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });

  test('displays error message on failure', async () => {
    // Mock API to return error
    vi.spyOn(api, 'getData').mockRejectedValue(new Error('Failed'));
    
    render(<MyComponent />);
    
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Tests not finding modules
- Check that paths are correct
- Verify vitest.config.js alias settings match your imports

### Tests fail with "cannot find module"
- Run `npm install` to ensure all dependencies are installed
- Check that the file being imported exists

### Mock not working
- Ensure `vi.mock()` is called before importing the module
- Use `vi.clearAllMocks()` in beforeEach to reset mocks

### React component not rendering
- Ensure you're using `render()` from @testing-library/react
- Check that all required props are provided

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
