# Redux State Management

This directory contains all Redux-related code for state management in the application.

## Structure
- /slices - Redux Toolkit slices for different features
- /selectors - Reusable selectors for accessing state
- /middleware - Custom Redux middleware
- store.ts - Redux store configuration

## Guidelines
- Use Redux Toolkit for all Redux code
- Keep selectors memoized using createSelector
- Document state shape with TypeScript interfaces
- Follow Redux best practices for immutable updates 