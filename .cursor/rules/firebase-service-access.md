@rule firebase-service-access "Use helper functions from firebase.ts for accessing Firebase services"
@description """
When accessing Firebase services (Firestore, Auth, Storage, etc.), always use the helper functions from `firebase.ts` rather than accessing service properties directly.

✅ Correct patterns:
```typescript
import { getFirestore } from '../services/firebase';

// Inside your service/component
const db = getFirestore();
```

❌ Incorrect patterns:
```typescript
const db = serviceManager.getFirestoreService().db; // Don't do this - db is private
```

This rule ensures:
- Consistent error handling across the application
- Proper logging and error reporting
- Type safety and better IDE support
- Centralized service management
"""

@examples """
✅ Good:
```typescript
import { getFirestore } from '../services/firebase';

class MyService {
  private getDb(): Firestore {
    return getFirestore();
  }
  
  async someMethod() {
    const db = this.getDb();
    // Use db...
  }
}
```

❌ Bad:
```typescript
import { serviceManager } from '../store/slices/firebase/services/ServiceManager';

class MyService {
  private getDb(): Firestore {
    const db = serviceManager.getFirestoreService().db;
    if (!db) throw new Error('Firestore not initialized');
    return db;
  }
}
```
"""

@fix """
1. Import the helper function:
   ```typescript
   import { getFirestore } from '../services/firebase';
   ```

2. Replace direct access with helper:
   ```typescript
   // Before
   const db = serviceManager.getFirestoreService().db;
   
   // After
   const db = getFirestore();
   ```

3. Remove any manual error handling as it's included in the helper
"""

@references """
- `src/services/firebase.ts` - Contains all Firebase service helper functions
- Firebase documentation on initialization: https://firebase.google.com/docs/web/setup
""" 