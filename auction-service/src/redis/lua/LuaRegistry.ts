import Redis from 'ioredis';
import { scripts, computeChecksum } from './scripts';
import { logger } from '../../shared/logger';
import { InfrastructureError } from '../../shared/errors';
import { RedisMetrics } from '../metrics';

export class LuaRegistry {
  private registered: Set<string> = new Set();

  constructor(private client: Redis) {}

  /**
   * Registers all predefined Lua scripts onto the Redis connection.
   */
  registerScripts() {
    for (const script of scripts) {
      const checksum = computeChecksum(script.lua);
      this.client.defineCommand(script.name, {
        numberOfKeys: script.numberOfKeys,
        lua: script.lua,
      });
      this.registered.add(script.name);
      logger.info(
        { scriptName: script.name, version: script.version, checksum },
        'Lua script registered successfully'
      );
    }
  }

  /**
   * Executes a registered Lua script securely.
   */
  async execute(scriptName: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    if (!this.registered.has(scriptName)) {
      throw new InfrastructureError(`Attempted to execute unregistered Lua script: ${scriptName}`);
    }

    const start = Date.now();
    try {
      // @ts-ignore - dynamic method execution via ioredis defineCommand
      const result = await this.client[scriptName](...keys, ...args);
      RedisMetrics.recordLuaExecution(scriptName, Date.now() - start);
      return result;
    } catch (error) {
      logger.error({ err: error, scriptName, keys, args }, 'Error executing Lua script');
      throw new InfrastructureError(`Lua script execution failed: ${scriptName}`);
    }
  }
}
