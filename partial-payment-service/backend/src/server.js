import { ENV } from './config/env.js';
import app from './app.js';
import { getLogger } from './utils/logger.js';
import { createRecoveryWorker } from './services/recoveryWorker.js';
import { attemptRepository } from './repositories/attemptRepository.js';
import { rollbackRepository } from './repositories/rollbackRepository.js';
import { createDraftOrderService } from './shopify/draftOrder.js';
import { createOrderService } from './shopify/order.js';
import { executeGraphQL } from './shopify/client.js';

const log = getLogger('server');
const PORT = ENV.PORT || 3000;

app.listen(PORT, async () => {
  log.info(`[partial-payment-service] Server running on port ${PORT}`);
  log.info(`[partial-payment-service] Environment: ${ENV.NODE_ENV}`);
  log.info(`[partial-payment-service] Dry Run Mode: ${ENV.DRY_RUN}`);

  // Run the Self-Healing Recovery Worker
  try {
    const recoveryWorker = createRecoveryWorker({
      attemptRepository,
      rollbackRepository,
      draftOrderService: createDraftOrderService(executeGraphQL),
      orderService: createOrderService(executeGraphQL)
    });
    
    // We do not block the server startup entirely, but we await it to complete in the background.
    // Or we can await it if we want strict startup blocking. The user said: "Recovery must happen automatically after restart."
    await recoveryWorker.runRecovery(0); // QA TEST 4: Instantly scan instead of waiting 5 minutes
  } catch (err) {
    log.error({ err: err.message }, 'Failed to run Recovery Worker on startup');
  }
});
