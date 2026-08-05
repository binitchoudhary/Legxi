import { IUserService, UserProfileDto } from '../../application/ports/IUserService';

export class MockUserService implements IUserService {
  public async getUserProfile(userId: string): Promise<UserProfileDto | null> {
    // In a real implementation, this would fetch from Firebase Auth or a user database
    return {
      id: userId,
      name: `User ${userId}`,
      phone: '+15555555555',
      email: `user${userId}@example.com`
    };
  }
}
