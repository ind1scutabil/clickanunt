/**
 * Heavy Task Queue - Async Processing
 * 
 * Features:
 * - Task queuing (email, image processing, reporting)
 * - Priority levels
 * - Retry with exponential backoff
 * - Dead-letter queue
 * - Monitoring & observability
 */

export type TaskType = 
  | 'send_email'
  | 'process_image'
  | 'generate_report'
  | 'send_notification'
  | 'index_search'
  | 'cleanup_temp'
  | 'batch_operation';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retry';

export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  payload: Record<string, unknown>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
  maxAttempts: number;
  nextRetry?: number;
  error?: string;
  userId?: string;
  result?: Record<string, unknown>;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadletter: number;
  avgProcessingTime: number;
}

/**
 * Task queue implementation
 */
class TaskQueue {
  private queue: Map<string, Task> = new Map();
  private deadLetterQueue: Map<string, Task> = new Map();
  private stats: QueueStats = {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deadletter: 0,
    avgProcessingTime: 0,
  };

  private readonly priorityOrder: TaskPriority[] = ['critical', 'high', 'normal', 'low'];
  private readonly maxQueueSize = 10000;
  private readonly maxDeadLetterSize = 1000;

  constructor() {
    // Cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Enqueue a task
   */
  enqueue(
    type: TaskType,
    payload: Record<string, unknown>,
    options: {
      priority?: TaskPriority;
      maxAttempts?: number;
      userId?: string;
    } = {}
  ): Task {
    if (this.queue.size >= this.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const task: Task = {
      id: this.generateTaskID(),
      type,
      priority: options.priority || 'normal',
      status: 'pending',
      payload,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      userId: options.userId,
    };

    this.queue.set(task.id, task);
    this.stats.pending++;
    this.stats.total++;

    console.log(`[QUEUE] Task enqueued: ${task.id} (${type})`);
    return task;
  }

  /**
   * Dequeue next task (respects priority)
   */
  dequeue(): Task | null {
    // Sort by priority, then by creation time
    const sorted = Array.from(this.queue.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => {
        const aPriority = this.priorityOrder.indexOf(a.priority);
        const bPriority = this.priorityOrder.indexOf(b.priority);
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.createdAt - b.createdAt;
      });

    if (sorted.length === 0) return null;

    const task = sorted[0];
    task.status = 'processing';
    task.startedAt = Date.now();
    task.attempts++;

    this.stats.pending--;
    this.stats.processing++;

    return task;
  }

  /**
   * Mark task as completed
   */
  complete(taskId: string, result?: Record<string, unknown>): void {
    const task = this.queue.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = Date.now();
    task.result = result;

    this.stats.processing--;
    this.stats.completed++;

    console.log(`[QUEUE] Task completed: ${taskId}`);
  }

  /**
   * Mark task as failed and retry if applicable
   */
  fail(taskId: string, error: string): void {
    const task = this.queue.get(taskId);
    if (!task) return;

    task.error = error;

    if (task.attempts < task.maxAttempts) {
      // Retry with exponential backoff
      const backoffMs = Math.min(
        1000 * Math.pow(2, task.attempts - 1),
        60000 // Max 1 minute
      );

      task.status = 'retry';
      task.nextRetry = Date.now() + backoffMs;

      this.stats.processing--;
      console.log(`[QUEUE] Task retry scheduled: ${taskId} (attempt ${task.attempts}/${task.maxAttempts})`);
    } else {
      // Move to dead letter queue
      task.status = 'failed';
      this.queue.delete(taskId);
      this.deadLetterQueue.set(taskId, task);

      this.stats.processing--;
      this.stats.failed++;
      this.stats.deadletter++;

      console.error(`[QUEUE] Task failed (max attempts): ${taskId}`);
    }
  }

  /**
   * Get task status
   */
  getTask(taskId: string): Task | null {
    return this.queue.get(taskId) || this.deadLetterQueue.get(taskId) || null;
  }

  /**
   * Get pending tasks count
   */
  getPendingCount(): number {
    return this.stats.pending;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Process retry tasks
   */
  processRetries(): void {
    const now = Date.now();
    const toRetry: Task[] = [];

    this.queue.forEach(task => {
      if (
        task.status === 'retry' &&
        task.nextRetry &&
        task.nextRetry <= now
      ) {
        task.status = 'pending';
        this.stats.pending++;
        toRetry.push(task);
      }
    });

    if (toRetry.length > 0) {
      console.log(`[QUEUE] Retrying ${toRetry.length} tasks`);
    }
  }

  /**
   * Cleanup old tasks
   */
  private cleanup(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const toDelete: string[] = [];

    this.queue.forEach((task, id) => {
      if (task.completedAt && now - task.completedAt > maxAge) {
        toDelete.push(id);
      }
    });

    // Keep latest in dead letter
    const deadLetterArray = Array.from(this.deadLetterQueue.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(this.maxDeadLetterSize);

    deadLetterArray.forEach(task => {
      this.deadLetterQueue.delete(task.id);
    });

    toDelete.forEach(id => {
      this.queue.delete(id);
    });

    this.processRetries();

    console.log(`[QUEUE] Cleanup: removed ${toDelete.length} tasks`);
  }

  /**
   * Get dead letter queue items
   */
  getDeadLetterItems(limit: number = 100): Task[] {
    return Array.from(this.deadLetterQueue.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Generate unique task ID
   */
  private generateTaskID(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export queue state (for persistence)
   */
  exportState(): { queue: Task[]; deadLetter: Task[] } {
    return {
      queue: Array.from(this.queue.values()),
      deadLetter: Array.from(this.deadLetterQueue.values()),
    };
  }

  /**
   * Import queue state
   */
  importState(state: { queue: Task[]; deadLetter: Task[] }): void {
    this.queue.clear();
    this.deadLetterQueue.clear();

    state.queue.forEach(task => {
      this.queue.set(task.id, task);
    });

    state.deadLetter.forEach(task => {
      this.deadLetterQueue.set(task.id, task);
    });
  }
}

/**
 * Export singleton
 */
export const taskQueue = new TaskQueue();

/**
 * Task worker for processing
 */
export async function processTaskWorker(handler: (task: Task) => Promise<void>): Promise<void> {
  const task = taskQueue.dequeue();
  if (!task) return;

  try {
    console.log(`[WORKER] Processing task: ${task.id} (${task.type})`);
    await handler(task);
    taskQueue.complete(task.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    taskQueue.fail(task.id, errorMessage);
  }
}

/**
 * Common task payloads
 */
export const TASK_EXAMPLES = {
  send_email: {
    to: 'user@example.com',
    template: 'welcome',
    data: {},
  },
  process_image: {
    inputPath: '/uploads/original.jpg',
    operations: ['resize', 'compress', 'thumbnail'],
  },
  generate_report: {
    type: 'monthly',
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    endDate: Date.now(),
    format: 'pdf',
  },
  send_notification: {
    userId: 'user-123',
    type: 'listing_new_offer',
    data: { offerId: 'offer-456' },
  },
  index_search: {
    operation: 'rebuild',
    index: 'listings',
  },
} as const;
