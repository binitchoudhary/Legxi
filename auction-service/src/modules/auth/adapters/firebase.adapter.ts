import { IdentityAdapter, UserContext, CurrentUser } from '../interfaces';
import { Role } from '../constants';
import { InvalidIdentity, IdentityExpired, AuthenticationRequired } from '../../../shared/errors';

export class FirebaseIdentityAdapter implements IdentityAdapter {
   
  async authenticate(token: string): Promise<UserContext> {
    throw new Error('FirebaseIdentityAdapter is a placeholder and should not be invoked directly for token verification.');
  }
}
