export interface UserProfileDto {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface IUserService {
  getUserProfile(userId: string): Promise<UserProfileDto | null>;
}
