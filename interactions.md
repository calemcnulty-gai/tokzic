# Video Interaction System

## Current State

### Architecture
- Multiple slices handling interactions:
  - `interactionSlice`: Handles likes, dislikes, comments, tips
  - `videoSlice`: Also handles likes/dislikes
  - `uiSlice`: Handles UI state for interactions

### Data Flow
1. UI Components (`VideoOverlay.tsx`) dispatch actions from multiple slices
2. Actions split between:
   - `videoSlice` thunks
   - `interactionSlice` thunks
   - Direct Firebase calls
3. No consistent pattern for state updates

### State Management
1. `interactionSlice` State:
   ```typescript
   {
     comments: Record<string, Comment[]>;
     likes: Record<string, Like[]>;
     dislikes: Record<string, Dislike[]>;
     tips: Record<string, Tip[]>;
     isLoading: boolean;
     error: string | null;
   }
   ```

2. `videoSlice` Interaction State:
   ```typescript
   {
     interactions: {
       [videoId: string]: {
         isLiked: boolean;
         isDisliked: boolean;
         comments: Comment[];
       }
     }
   }
   ```

3. `uiSlice` Loading States:
   ```typescript
   {
     loadingStates: {
       isLoadingComments: boolean;
       isSubmittingComment: boolean;
       isProcessingTip: boolean;
       isProcessingLike: boolean;
     }
   }
   ```

### Services
- `VideoInteractionService`: Handles user-driven events (likes, comments, tips)
- `VideoMetadataService`: Handles background events (view counts, metadata updates)

## Target State

### Architecture
1. Single Source of Truth
   - All interaction logic consolidated in `interactionSlice`
   - All Firebase interactions through service layer
   - UI state derived from interaction state

2. Clear Data Flow
   ```
   UI Action -> interactionSlice thunk -> VideoInteractionService -> Firebase -> Update Redux State
   ```

3. Unified Loading State
   - Use `LoadingState` interface from `types.ts`
   - Single loading state per interaction type
   ```typescript
   interface LoadingState {
     isLoading: boolean;
     isLoaded: boolean;
     error: string | null;
   }
   ```

### State Updates
- Thunk return values update UI state
- No Firestore subscriptions for interactions
- Error handling consolidated in interaction state

## Migration Plan

### Phase 1: State Consolidation ✅
- [x] Update `interactionSlice` state:
  - [x] Add `loadingState: LoadingState`
  - [x] Remove duplicate state from `videoSlice`
  - [x] Update selectors to use consolidated state
  - [x] Fix type definitions and imports
  - [x] Align with types.ts definitions

### Phase 2: Service Layer ✅
- [x] Audit `VideoInteractionService`:
  - [x] Ensure all Firebase operations are properly handled
    - Added batch operations for atomic updates
    - Added proper error type checking
    - Added null checks for Firestore initialization
  - [x] Add proper error handling and logging
    - Added `InteractionResult<T>` type for consistent error handling
    - Improved error messages with FirebaseError handling
    - Enhanced logging with detailed success/failure information
  - [x] Validate return types match state requirements
    - Updated return types to include success/error status
    - Added proper typing for all operations
    - Ensured consistency with Redux state structure

### Phase 3: Thunk Migration ✅
- [x] Move all interaction thunks to `interactionSlice`:
  - [x] `toggleLike`
  - [x] `toggleDislike`
  - [x] `addComment`
  - [x] `addTip`
  - [x] Ensure proper error handling
  - [x] Return updated data for state updates

### Phase 4: UI Updates ✅
- [x] Update `VideoOverlay.tsx`:
  - [x] Use consolidated interaction actions
  - [x] Update loading state references
  - [x] Update error handling

### Phase 5: Cleanup (In Progress)
- [x] Remove interaction-related selectors from `uiSlice`
- [x] Fix type imports and definitions:
  - [x] Remove unused type imports from `interactionSlice.ts`
  - [x] Remove duplicate LoadingState imports
  - [x] Clean up interaction type imports
  - [x] Remove unused VideoInteractionState and InteractionType imports
  - [x] Remove unused CommentPayload and TipPayload imports
  - [x] Remove unused InteractionLoadingState and VideoInteractionResponse imports
  - [x] Remove unused fetchFirebaseLikes import
- [ ] Fix remaining type errors:
  - [ ] Update `AuthState` interface to include required properties
  - [x] Fix `VideoState` interface to include `pendingGenerations`
  - [x] Fix Firebase user type issues:
    - [x] Removed `WritableDraft` usage from state
    - [x] Using consistent `User` type from `auth.ts`
    - [x] Simplified user state management in reducers
  - [ ] Ensure proper typing for all thunks
- [ ] Remove old interaction code:
  - [ ] Clean up `videoSlice` interaction logic
  - [ ] Remove unused UI loading states
  - [ ] Remove unused selectors
  - [ ] Update tests to use new structure

## Implementation Notes

### Error Handling
- All Firebase errors should be caught in thunks
- Errors should be stored in interaction state
- UI can listen for error state changes

### Loading States
- Use `LoadingState` interface consistently
- UI components should derive loading state from interaction slice
- Clear loading states on success/error

### State Updates
- Thunks should return complete updated data
- State should be updated atomically
- Maintain referential integrity for React renders

### Performance Considerations
- Batch updates where possible
- Consider optimistic updates for better UX
- Cache interaction data appropriately 