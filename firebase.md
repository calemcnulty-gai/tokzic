# Firebase SDK Migration Checklist

## Current Firebase Usage Analysis
- [x] Firebase services currently in use:
  - Authentication (auth)
  - Firestore (db)
  - Storage (storage)
  - Analytics (analytics)
- [x] Files using Firebase:
  - `src/config/firebase.ts` - Core Firebase configuration
  - `src/services/auth.ts` - Authentication service
  - `src/services/firebase.ts` - Firebase service exports
  - `src/services/user.ts` - User management
  - `src/services/video.ts` - Video management with Firestore/Storage
  - `src/services/video-metadata.ts` - Video metadata management
  - `src/store/slices/authSlice.ts` - Auth state management
  - `src/store/slices/interactionSlice.ts` - User interactions
  - `src/hooks/useAppNavigation.ts` - Analytics integration
  - `src/store/middleware/performanceMiddleware.ts` - Analytics integration
  - `src/components/AuthInitializer.tsx` - Auth state initialization

## Rationale for Redux-First Approach
- **Single Source of Truth**: Centralizing Firebase service instances in Redux ensures consistent access across the app
- **Initialization Control**: Better management of Firebase service initialization and lifecycle
- **Type Safety**: Stronger typing for Firebase services and their states
- **Testing**: Easier mocking of Firebase services for testing
- **Error Handling**: Centralized error handling for Firebase operations
- **State Management**: Better control over loading states and operation status
- **Performance**: Reduced duplicate Firebase instance creation
- **Debugging**: Improved ability to track Firebase-related state changes

## Phase 1: Redux State Management
- [x] Create Firebase Redux slice:
  - [x] Create `src/store/slices/firebaseSlice.ts`
  - [x] Initialize and export Firebase service instances (auth, firestore, storage, analytics)
  - [x] Add state for service initialization status
  - [x] Add error handling for service initialization
  - [x] Add selectors for accessing Firebase services

- [x] Update existing Redux slices:
  - [x] Update `authSlice.ts`:
    - [x] Remove direct Firebase imports
    - [x] Get Firebase auth instance from store
    - [x] Update auth state listener
    - [x] Update auth action creators
  - [x] Update `interactionSlice.ts`:
    - [x] Remove direct Firebase imports
    - [x] Get Firestore instance from store
    - [x] Update Firestore operations
  - [x] Update `videoSlice.ts`:
    - [x] Remove direct Firebase imports
    - [x] Get Firestore/Storage instances from store
    - [x] Update video operations

- [x] Update Firebase service consumers:
  - [x] Update all components to use Firebase instances from Redux
  - [x] Update all hooks to use Firebase instances from Redux
  - [x] Update all services to use Firebase instances from Redux
  - [x] Update middleware to use Firebase instances from Redux

## Phase 2: Package Management
- [x] Remove React Native Firebase packages
- [x] Install Firebase Web SDK
- [x] Update iOS Podfile to remove Firebase dependencies
- [x] Clean and reinstall dependencies

## Phase 3: Firebase Configuration
- [x] Create new Firebase configuration file:
  - [x] Update `src/config/firebase.ts` to use web SDK
  - [x] Import and initialize required services
  - [x] Set up environment variables if needed
- [x] Update Firebase initialization in the app
- [x] Test basic Firebase connectivity

## Phase 4: Authentication Migration
- [x] Update `src/services/auth.ts`:
  - [x] Replace auth imports
  - [x] Update Google Sign-In integration
  - [x] Update auth state listener
  - [x] Manual review complete
- [x] Update `src/components/AuthInitializer.tsx`:
  - [x] Replace auth state listener
  - [x] Manual review complete
- [x] Update `src/store/slices/authSlice.ts`:
  - [x] Update Firebase types
  - [x] Modify auth state management
  - [x] Manual review complete

## Phase 5: Firestore Migration
- [x] Update `src/services/video.ts`:
  - [x] Replace Firestore imports
  - [x] Update query methods
  - [x] Manual review complete
- [x] Update `src/services/video-metadata.ts`:
  - [x] Replace Firestore imports
  - [x] Update metadata operations
  - [x] Manual review complete
- [x] Update `src/store/slices/interactionSlice.ts`:
  - [x] Replace Firestore imports
  - [x] Update interaction operations
  - [x] Manual review complete
- [x] Update `src/store/slices/videoSlice.ts`:
  - [x] Update Firebase types
  - [x] Update query document snapshot types
  - [x] Manual review complete
- [x] Update `src/services/video-interactions.ts`:
  - [x] Replace Firestore imports
  - [x] Update Firestore operations
  - [x] Update field value operations
  - [x] Manual review complete

## Phase 6: Storage Migration
- [x] Update storage operations in `src/services/video.ts`:
  - [x] Replace storage imports
  - [x] Update file upload methods
  - [x] Update file download methods
  - [x] Add video deletion method
  - [x] Manual review complete

## Phase 7: Analytics Migration
- [x] Update `src/hooks/useAppNavigation.ts`:
  - [x] Replace analytics imports
  - [x] Update tracking methods
  - [x] Manual review complete
- [x] Update `src/store/middleware/performanceMiddleware.ts`:
  - [x] Replace analytics imports
  - [x] Update performance tracking
  - [x] Manual review complete

## Phase 8: Type System Updates
- [x] Update `src/types/auth.ts`:
  - [x] Replace Firebase types with Web SDK equivalents
- [x] Update `src/types/firestore.ts`:
  - [x] Update collection types
  - [x] Update document types
- [x] Update any other type definitions using Firebase types

## Phase 9: Cleanup
- [x] Remove unused Firebase native configurations
- [x] Update documentation
- [x] Remove deprecated code
- [x] Update error handling
- [ ] Final testing pass

## Notes
- Keep track of any breaking changes between RN Firebase and Web SDK
- Document any workarounds needed for platform-specific issues
- Consider implementing feature flags for gradual rollout
- Maintain backwards compatibility where possible during migration
- **Redux First**: All Firebase service instances and state management must be implemented in Redux before proceeding with other phases 