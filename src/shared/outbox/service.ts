/**
 * Outbox Service - Reliable event publishing
 * Implements transactional outbox pattern for reliable external communication
 */
import { OutboxEvent, IOutboxEvent } from './model';
import mongoose from 'mongoose';

export class OutboxService {
  /**
   * Create outbox event within a transaction
   */
  static async createEvent(
    session: mongoose.ClientSession,
    topic: string,
    payload: any
  ): Promise<IOutboxEvent> {
    const [event] = await OutboxEvent.create([{
      topic,
      payload,
      processed: false
    }], { session });

    return event;
  }

  /**
   * Get unprocessed events for publishing
   */
  static async getUnprocessedEvents(limit = 100): Promise<IOutboxEvent[]> {
    return OutboxEvent.find({ processed: false })
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  /**
   * Mark event as processed
   */
  static async markProcessed(eventId: string): Promise<void> {
    await OutboxEvent.findByIdAndUpdate(eventId, {
      processed: true,
      processedAt: new Date()
    });
  }

  /**
   * Mark event as failed with error
   */
  static async markFailed(eventId: string, error: string): Promise<void> {
    await OutboxEvent.findByIdAndUpdate(eventId, {
      $inc: { retryCount: 1 },
      lastError: error
    });
  }
}