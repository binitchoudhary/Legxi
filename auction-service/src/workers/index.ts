import { Queue, Worker, Job } from 'bullmq';
import { bullmqConfig } from '../config';
import { logger } from '../shared/logger';
import { InfrastructureError } from '../shared/errors';

export const queueRegistry: Map<string, Queue> = new Map();
export const workerRegistry: Map<string, Worker> = new Map();

export function registerQueue(name: string): Queue {
  if (queueRegistry.has(name)) {
    return queueRegistry.get(name)!;
  }
  
  const queue = new Queue(name, {
    connection: bullmqConfig.connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    }
  });
  
  queueRegistry.set(name, queue);
  logger.info({ queueName: name }, 'BullMQ Queue registered');
  return queue;
}

export function registerWorker(name: string, processor: (job: Job) => Promise<unknown>): Worker {
  if (workerRegistry.has(name)) {
    return workerRegistry.get(name)!;
  }

  const worker = new Worker(name, processor, {
    connection: bullmqConfig.connection,
    concurrency: 5,
  });

  worker.on('error', (err) => logger.error({ err, workerName: name }, 'Worker Error'));
  worker.on('failed', (job, err) => logger.error({ err, jobId: job?.id, workerName: name }, 'Job Failed'));
  
  workerRegistry.set(name, worker);
  logger.info({ workerName: name }, 'BullMQ Worker registered');
  return worker;
}

export async function closeWorkers(): Promise<void> {
  try {
    const workerPromises = Array.from(workerRegistry.values()).map(w => w.close());
    const queuePromises = Array.from(queueRegistry.values()).map(q => q.close());
    
    await Promise.all([...workerPromises, ...queuePromises]);
    logger.info('BullMQ Workers and Queues disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting BullMQ');
    throw new InfrastructureError('Failed to disconnect BullMQ');
  }
}
