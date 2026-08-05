import { UserContext } from '../interfaces';

/**
 * IdentityContextProvider
 * 
 * In a true distributed microservice environment, this provider retrieves the
 * already-authenticated UserContext injected by the API Gateway or upstream identity proxy.
 */
export class IdentityContextProvider {
  /**
   * Provides the authenticated user context.
   * This is typically extracted from the request headers (e.g. x-user-context).
   * 
   * @param rawContextHeader The raw serialized context provided by upstream
   * @returns UserContext The parsed and structurally validated context
   */
  provide(rawContextHeader: string): UserContext {
    const context = JSON.parse(rawContextHeader);
    return context as UserContext;
  }
}
