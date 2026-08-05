export interface MessageEnvelope<T> {
  id: string; // Message UUID or Sequence
  timestamp: number;
  payload: T;
}
