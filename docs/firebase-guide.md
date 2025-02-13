# Firebase Integration Guide

## Overview
Tokzic uses Firebase for authentication, data storage, file storage, and analytics. All Firebase services are managed through Redux to ensure a single source of truth and consistent state management across the app.

## Architecture
- All Firebase service instances are managed in the Firebase Redux slice
- Firebase operations are performed through Redux actions and thunks
- State for all Firebase operations (loading, errors, etc.) is tracked in Redux
- Components never interact with Firebase directly - they dispatch actions and read state through selectors

## Available Services

### Authentication (`auth`)
```typescript
// Sign in with email
dispatch(signIn({ email, password }))

// Sign in with Google
dispatch(signInWithGoogle())

// Sign out
dispatch(signOut())

// Get current user
const user = useSelector(selectCurrentUser)

// Check auth state
const isAuthenticated = useSelector(selectIsAuthenticated)
```

### Firestore (`firestore`)
```typescript
// Fetch a document
dispatch(fetchDocument({ collection: 'videos', id: videoId }))

// Update a document
dispatch(updateDocument({
  collection: 'videos',
  id: videoId,
  data: { title: 'New Title' }
}))

// Query a collection
dispatch(queryCollection({
  collection: 'videos',
  where: [['userId', '==', currentUserId]],
  orderBy: [['createdAt', 'desc']],
  limit: 10
}))
```

### Storage (`storage`)
```typescript
// Upload a file
dispatch(uploadFile({
  path: `videos/${videoId}`,
  file: videoFile,
  metadata: { contentType: 'video/mp4' }
}))

// Download a file
dispatch(downloadFile({
  path: `videos/${videoId}`
}))

// Delete a file
dispatch(deleteFile({
  path: `videos/${videoId}`
}))
```

### Analytics (`analytics`)
```typescript
// Log an event
dispatch(logEvent({
  name: 'video_play',
  params: { videoId, duration }
}))

// Track screen view
dispatch(trackScreenView({
  screenName: 'VideoFeed'
}))
```

## State Management

### Selectors
```typescript
// Loading states
const isLoading = useSelector(selectIsLoading)
const isUploading = useSelector(selectIsUploading)

// Error states
const error = useSelector(selectError)
const uploadError = useSelector(selectUploadError)

// Progress
const uploadProgress = useSelector(selectUploadProgress)

// Cache
const videoData = useSelector(selectVideoData(videoId))
```

## Error Handling
All Firebase operations include proper error handling:
- Network errors are automatically retried
- Authentication errors trigger appropriate UI feedback
- Upload/download errors can be resumed
- All errors are logged to analytics

## Performance Optimization
- Firebase SDK's built-in caching is utilized for Firestore queries
- Redux state serves as an application-level cache
- Selectors are memoized for optimal performance
- Large file uploads are chunked and can be resumed
- Analytics events are batched for efficient network usage

## Best Practices
1. Never import Firebase services directly - use Redux actions
2. Use TypeScript for all Firebase operations
3. Handle loading and error states appropriately in UI
4. Follow the principle of least privilege for security rules
5. Keep documents small and normalize data structure
6. Use batch operations for related updates
7. Implement proper cleanup in components
8. Monitor analytics for performance issues

## Common Patterns

### Authentication Flow
```typescript
function LoginScreen() {
  const dispatch = useDispatch()
  const isLoading = useSelector(selectIsAuthLoading)
  const error = useSelector(selectAuthError)
  
  const handleLogin = async (email: string, password: string) => {
    dispatch(signIn({ email, password }))
  }
  
  // ... render login form
}
```

### Data Fetching
```typescript
function VideoFeed() {
  const dispatch = useDispatch()
  const videos = useSelector(selectVideos)
  const isLoading = useSelector(selectIsLoading)
  
  useEffect(() => {
    dispatch(queryCollection({
      collection: 'videos',
      orderBy: [['createdAt', 'desc']],
      limit: 10
    }))
  }, [dispatch])
  
  // ... render video feed
}
```

### File Upload
```typescript
function VideoUpload() {
  const dispatch = useDispatch()
  const progress = useSelector(selectUploadProgress)
  const error = useSelector(selectUploadError)
  
  const handleUpload = (file: File) => {
    const videoId = generateId()
    dispatch(uploadFile({
      path: `videos/${videoId}`,
      file,
      metadata: { contentType: file.type }
    }))
  }
  
  // ... render upload UI
}
```

## Security
- All Firebase security rules are in `firestore.rules` and `storage.rules`
- Authentication state is encrypted in Redux persist
- API keys and secrets are managed through environment variables
- File uploads are validated on both client and server
- User permissions are checked before all operations

## Testing
- Mock Firebase services are provided for testing
- Redux actions and reducers have full test coverage
- Integration tests verify Firebase operations
- E2E tests cover critical user flows

## Troubleshooting
Common issues and their solutions:
1. Authentication errors
   - Check network connection
   - Verify credentials
   - Clear local storage
   
2. Upload failures
   - Check file size limits
   - Verify network stability
   - Try resuming upload
   
3. Query performance
   - Review index usage
   - Check query patterns
   - Consider pagination

## Resources
- [Firebase Web Documentation](https://firebase.google.com/docs/web/setup)
- [Redux Documentation](https://redux.js.org/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- Internal Architecture Docs: `firebase-redux.md` 