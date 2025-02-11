import { createLogger } from '../utils/logger';

const logger = createLogger('OperationQueue');

interface QueuedOperation<T> {
  id: string;
  operation: () => Promise<T>;
  priority: number;
  timestamp: number;
  resourceLocks: Set<string>;
}

export class OperationQueue {
  private queue: Map<string, QueuedOperation<any>> = new Map();
  private inProgress: Set<string> = new Set();
  private isProcessing: boolean = false;
  private resourceLocks: Map<string, string> = new Map(); // resource -> operation id
  private static OPERATION_TIMEOUT = 30000; // 30 seconds

  async enqueue<T>(
    id: string,
    operation: () => Promise<T>,
    priority: number = 0,
    resourceLocks: string[] = []
  ): Promise<T> {
    logger.debug('Enqueueing operation', { 
      id, 
      priority, 
      resourceLocks,
      queueSize: this.queue.size,
      inProgressCount: this.inProgress.size
    });

    // Check if any required resources are locked by other operations
    const conflictingOp = this.findConflictingOperation(resourceLocks);
    if (conflictingOp) {
      logger.debug('Operation waiting for resources', {
        id,
        conflictingOp,
        resourceLocks
      });
      // Wait for conflicting operation if it exists
      const existing = this.queue.get(conflictingOp);
      if (existing) {
        return existing.operation() as Promise<T>;
      }
    }

    // If operation is already in progress, wait for it
    if (this.inProgress.has(id)) {
      logger.debug('Operation already in progress', { id });
      const existing = this.queue.get(id);
      if (existing) {
        return existing.operation() as Promise<T>;
      }
    }

    // If operation is queued but not started, update priority if higher
    const existing = this.queue.get(id);
    if (existing && priority > existing.priority) {
      logger.debug('Updating operation priority', {
        id,
        oldPriority: existing.priority,
        newPriority: priority
      });
      existing.priority = priority;
      return existing.operation() as Promise<T>;
    }

    // Create new operation wrapper with timeout
    const wrappedOperation = async (): Promise<T> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation ${id} timed out after ${OperationQueue.OPERATION_TIMEOUT}ms`));
        }, OperationQueue.OPERATION_TIMEOUT);
      });

      try {
        this.inProgress.add(id);
        // Acquire resource locks
        this.acquireResourceLocks(id, resourceLocks);
        logger.debug('Starting operation', { id });
        
        // Race between operation and timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);
        
        logger.debug('Completed operation', { id });
        return result;
      } catch (error) {
        logger.error('Operation failed', { id, error });
        throw error;
      } finally {
        this.releaseResourceLocks(id);
        this.inProgress.delete(id);
        this.queue.delete(id);
        this.processQueue();
      }
    };

    // Add to queue
    const queuedOperation: QueuedOperation<T> = {
      id,
      operation: wrappedOperation,
      priority,
      timestamp: Date.now(),
      resourceLocks: new Set(resourceLocks)
    };
    this.queue.set(id, queuedOperation);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return wrappedOperation();
  }

  private findConflictingOperation(resourceLocks: string[]): string | null {
    for (const resource of resourceLocks) {
      const conflictingOp = this.resourceLocks.get(resource);
      if (conflictingOp) {
        return conflictingOp;
      }
    }
    return null;
  }

  private acquireResourceLocks(operationId: string, resources: string[]) {
    for (const resource of resources) {
      this.resourceLocks.set(resource, operationId);
    }
  }

  private releaseResourceLocks(operationId: string) {
    for (const [resource, id] of this.resourceLocks.entries()) {
      if (id === operationId) {
        this.resourceLocks.delete(resource);
      }
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.size === 0) return;

    this.isProcessing = true;
    logger.debug('Processing queue', {
      queueSize: this.queue.size,
      inProgressCount: this.inProgress.size,
      lockedResources: Array.from(this.resourceLocks.entries())
    });

    try {
      // Sort operations by priority and timestamp
      const sortedOperations = Array.from(this.queue.values())
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority; // Higher priority first
          }
          return a.timestamp - b.timestamp; // Older first
        });

      // Process each operation
      for (const op of sortedOperations) {
        if (!this.inProgress.has(op.id)) {
          // Check if operation can proceed (no resource conflicts)
          const conflict = this.findConflictingOperation(Array.from(op.resourceLocks));
          if (!conflict) {
            await op.operation().catch(error => {
              logger.error('Queue operation failed', { id: op.id, error });
            });
          }
        }
      }
    } finally {
      this.isProcessing = false;
      // Check if more operations were added while processing
      if (this.queue.size > 0) {
        this.processQueue();
      }
    }
  }

  clear() {
    logger.info('Clearing operation queue');
    this.queue.clear();
    this.inProgress.clear();
    this.resourceLocks.clear();
    this.isProcessing = false;
  }
}

export const operationQueue = new OperationQueue(); 