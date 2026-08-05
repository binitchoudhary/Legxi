import crypto from 'crypto';

export interface LuaScriptDefinition {
  name: string;
  version: string;
  numberOfKeys: number;
  lua: string;
}

export const releaseLockScript: LuaScriptDefinition = {
  name: 'releaseLock',
  version: '1.0.0',
  numberOfKeys: 1,
  // ARGV[1] is the lock token
  lua: `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
  `
};

export const casScript: LuaScriptDefinition = {
  name: 'compareAndSet',
  version: '1.0.0',
  numberOfKeys: 1,
  // ARGV[1] is expected value, ARGV[2] is new value
  lua: `
local current = redis.call("get", KEYS[1])
if current == ARGV[1] then
    redis.call("set", KEYS[1], ARGV[2])
    return 1
else
    return 0
end
  `
};

export const scripts = [releaseLockScript, casScript];

export function computeChecksum(lua: string): string {
  return crypto.createHash('sha1').update(lua).digest('hex');
}
