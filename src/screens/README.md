# Screens

This directory contains the main screen components of the application. Each screen represents a full view that a user can navigate to.

## Structure
- Screens should be organized by feature or flow
- Each screen should have its own directory containing:
  - The screen component (ScreenName.tsx)
  - Screen-specific components
  - Navigation types
  - Screen-specific logic and hooks

## Guidelines
- Keep screen components focused on layout and composition
- Extract complex logic into custom hooks
- Use TypeScript for navigation params
- Follow the project's navigation patterns

Each screen should:
- Be focused on layout and composition
- Delegate complex logic to hooks and services
- Use TypeScript for type safety
- Follow the naming convention: [ScreenName]Screen.tsx

Note: App.tsx remains in the root directory as the application entry point, coordinating the loading and navigation of screens from this directory. 