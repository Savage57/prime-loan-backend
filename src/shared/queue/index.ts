/**
 * Queue Service - BullMQ wrapper for job processing
 * Manages background jobs for polling, penalties, and other async operations
 */
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class QueueService {
  private static queues = new Map<string, Queue>();
  private static workers = new Map<string, Worker>();

  static getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue(name, { connection: redis }));
    }
    return this.queues.get(name)!;
  }

  static createWorker(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    options: any = {}
  ): Worker {
    const worker = new Worker(queueName, processor, {
      connection: redis,
      ...options
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  static async addJob(queueName: string, jobName: string, data: any, options: any = {}) {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, options);
  }

  static async addRecurringJob(
    queueName: string,
    jobName: string,
    data: any,
    cronPattern: string
  ) {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, {
      repeat: { pattern: cronPattern }
    });
  }

  static async closeAll() {
    await Promise.all([
      ...Array.from(this.queues.values()).map(q => q.close()),
      ...Array.from(this.workers.values()).map(w => w.close())
    ]);
    await redis.quit();
  }
}