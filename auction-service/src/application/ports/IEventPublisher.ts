export interface IEventPublisher {
  publish(topic: string, payload: any): Promise<void>;
}
