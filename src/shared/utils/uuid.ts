/**
 * UUID utilities for generating trace IDs and unique identifiers
 */
import { v4 as uuidv4 } from 'uuid';

export class UuidService {
  static generate(): string {
    return uuidv4();
  }

  static generateTraceId(): string {
    return `trace_${uuidv4()}`;
  }

  static generateIdempotencyKey(): string {
    return `idem_${uuidv4()}`;
  }
}