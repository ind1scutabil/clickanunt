/**
 * Background Jobs Queue Framework
 * 
 * Handles async tasks:
 * - Email sending
 * - Image processing
 * - Notifications
 * - Indexing
 * - Cleanup
 * 
 * Uses in-memory queue in dev, should use Bull + Redis in production
 */

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  nextRetryAt?: number;
}

export type JobHandler<T = unknown> = (data: T) => Promise<void>;

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start processing loop
    this.startProcessing();
  }

  /**
   * Register job handler
   */
  on<T>(type: string, handler: JobHandler<T>) {
    this.handlers.set(type, handler as JobHandler);
  }

  /**
   * Enqueue job
   */
  async enqueue<T>(
    type: string,
    data: T,
    options: { priority?: number; maxAttempts?: number } = {}
  ): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: Job<T> = {
      id: jobId,
      type,
      data,
      status: JobStatus.PENDING,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: Date.now(),
    };

    this.jobs.set(jobId, job);
    console.log(`📋 Job enqueued: ${type} (${jobId})`);

    return jobId;
  }

  /**
   * Start processing jobs
   */
  private startProcessing() {
    if (this.processInterval) return;

    this.processInterval = setInterval(async () => {
      if (this.processing) return;

      this.processing = true;
      await this.processPendingJobs();
      this.processing = false;
    }, 1000); // Process every second
  }

  /**
   * Process pending jobs
   */
  private async processPendingJobs() {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(
        j =>
          j.status === JobStatus.PENDING ||
          (j.status === JobStatus.RETRYING &&
            j.nextRetryAt &&
            j.nextRetryAt <= Date.now())
      )
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    for (const job of pendingJobs) {
      await this.processJob(job);
    }
  }

  /**
   * Process single job
   */
  private async processJob(job: Job) {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = JobStatus.FAILED;
      job.error = `No handler registered for job type: ${job.type}`;
      console.error(`❌ Job failed: ${job.id} - ${job.error}`);
      return;
    }

    job.status = JobStatus.PROCESSING;
    job.startedAt = Date.now();
    job.attempts++;

    try {
      await handler(job.data);
      job.status = JobStatus.COMPLETED;
      job.completedAt = Date.now();
      console.log(
        `✅ Job completed: ${job.type} (${job.id}) in ${job.completedAt - job.startedAt!}ms`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const backoffMs = Math.min(
          1000 * Math.pow(2, job.attempts - 1),
          5 * 60 * 1000 // Cap at 5 minutes
        );

        job.status = JobStatus.RETRYING;
        job.nextRetryAt = Date.now() + backoffMs;
        job.error = errorMsg;

        console.warn(
          `⚠️ Job retry scheduled: ${job.type} (${job.id}) - retry in ${Math.ceil(backoffMs / 1000)}s`
        );
      } else {
        // Max retries reached
        job.status = JobStatus.FAILED;
        job.error = errorMsg;
        console.error(
          `❌ Job failed after ${job.attempts} attempts: ${job.type} (${job.id}) - ${errorMsg}`
        );

        // Move to dead-letter queue
        this.handleDeadLetter(job);
      }
    }
  }

  /**
   * Handle job that failed permanently
   */
  private handleDeadLetter(job: Job) {
    console.error(`💀 Job moved to dead-letter: ${job.id}`, {
      type: job.type,
      data: job.data,
      error: job.error,
    });

    // In production, send alert to monitoring system
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send alert (Sentry, PagerDuty, etc)
    }
  }

  /**
   * Get job status
   */
  getStatus(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get statistics
   */
  getStats() {
    const allJobs = Array.from(this.jobs.values());
    return {
      total: allJobs.length,
      pending: allJobs.filter(j => j.status === JobStatus.PENDING).length,
      processing: allJobs.filter(j => j.status === JobStatus.PROCESSING).length,
      completed: allJobs.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: allJobs.filter(j => j.status === JobStatus.FAILED).length,
      retrying: allJobs.filter(j => j.status === JobStatus.RETRYING).length,
    };
  }

  /**
   * Cleanup old completed jobs (keep last 1000)
   */
  cleanup() {
    const sortedJobs = Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );

    if (sortedJobs.length > 1000) {
      sortedJobs.slice(1000).forEach(job => {
        this.jobs.delete(job.id);
      });
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    // Wait for processing jobs to complete
    let retries = 0;
    while (this.processing && retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    console.log('✅ Job queue shutdown complete');
  }
}

export const jobQueue = new JobQueue();

// Cleanup old jobs every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    jobQueue.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Job Types
 */
export enum JobType {
  SEND_EMAIL = 'SEND_EMAIL',
  PROCESS_IMAGE = 'PROCESS_IMAGE',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  INDEX_SEARCH = 'INDEX_SEARCH',
  CLEANUP_TEMP_FILES = 'CLEANUP_TEMP_FILES',
  GENERATE_REPORT = 'GENERATE_REPORT',
  BATCH_EMAIL = 'BATCH_EMAIL',
}
