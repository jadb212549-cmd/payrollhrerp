/**
 * User Repository - Data Access Layer for Application Users
 */

import { dbEngine } from '../db/database';
import { User } from '../db/schema';
import { SecurityService } from '../services/SecurityService';

const USER_STORE = 'users';

export class UserRepository {
  private static instance: UserRepository | null = null;

  private constructor() {}

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
  }

  /**
   * Initialize default Super Admin if store is empty
   */
  public async ensureDefaultAdmin(): Promise<User> {
    const users = await dbEngine.getAll<User>(USER_STORE);
    if (users.length === 0) {
      const defaultHash = await SecurityService.hashPassword('admin123');
      const admin: User = {
        id: 'usr_admin',
        username: 'admin',
        displayName: 'System Super Admin',
        email: 'admin@system.local',
        passwordHash: defaultHash,
        role: 'Super Admin',
        companyAccess: ['*'],
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await dbEngine.put<User>(USER_STORE, admin);
      return admin;
    }
    return users[0];
  }

  public async findById(id: string): Promise<User | null> {
    return dbEngine.get<User>(USER_STORE, id);
  }

  public async findByUsername(username: string): Promise<User | null> {
    const all = await this.findAll();
    return all.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  public async findAll(): Promise<User[]> {
    await this.ensureDefaultAdmin();
    return dbEngine.getAll<User>(USER_STORE);
  }

  public async save(user: User): Promise<User> {
    user.updatedAt = new Date().toISOString();
    await dbEngine.put<User>(USER_STORE, user);
    return user;
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(USER_STORE, id);
  }
}

export const userRepository = UserRepository.getInstance();
