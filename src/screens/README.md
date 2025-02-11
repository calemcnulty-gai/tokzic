# Screens

This directory contains the main screen components of the application. Each screen represents a full view that a user can navigate to.

## Structure
Screens are organized by feature, with each feature having its own directory:

```
screens/
├── auth/          # Authentication related screens
├── feed/          # Main feed and video viewing screens
└── [feature]/     # Future features get their own directory
```

Each feature directory should contain:
- Screen components (e.g., `FeedScreen.tsx`)
- Feature-specific components
- Feature-specific hooks and utilities
- Feature-specific types and constants

## Guidelines

### Organization
- Keep all feature-related code together in its feature directory
- Create new feature directories for new major features
- Use clear, descriptive names for directories and files

### Component Structure
- Screen components should focus on layout and composition
- Extract complex logic into custom hooks
- Keep components focused and maintainable (< 250 lines)
- Use TypeScript for type safety
- Follow the naming convention: `[ScreenName]Screen.tsx`

### Best Practices
- Minimize dependencies between feature directories
- Share common functionality through global components and hooks
- Keep screen components lightweight
- Document complex logic or business rules
- Use proper TypeScript types for navigation params

Note: While screen components live in their feature directories, shared components, hooks, and utilities should be placed in their respective top-level directories (e.g., `src/components`, `src/hooks`). 