import { BusinessRuleError } from './errors.js';

export const STATES = {
  PENDING: 'PENDING',
  CREATING_ORDER: 'CREATING_ORDER',
  VERIFYING: 'VERIFYING',
  SUCCESS: 'SUCCESS',
  ROLLBACK: 'ROLLBACK',
  FAILED: 'FAILED'
};

const VALID_TRANSITIONS = {
  [STATES.PENDING]: [STATES.CREATING_ORDER, STATES.FAILED],
  [STATES.CREATING_ORDER]: [STATES.VERIFYING, STATES.ROLLBACK, STATES.FAILED],
  [STATES.VERIFYING]: [STATES.SUCCESS, STATES.ROLLBACK, STATES.FAILED],
  [STATES.ROLLBACK]: [STATES.FAILED],
  [STATES.SUCCESS]: [],
  [STATES.FAILED]: []
};

export const stateMachine = {
  validateTransition(currentState, newState) {
    const allowed = VALID_TRANSITIONS[currentState] || [];
    if (!allowed.includes(newState)) {
      throw new BusinessRuleError(`Invalid state transition from ${currentState} to ${newState}`);
    }
    return true;
  }
};
