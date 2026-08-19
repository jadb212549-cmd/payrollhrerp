/**
 * User Service - Business Layer for Users and Access Control
 */

import { userRepository } from '../repositories/UserRepository';
import { User } from '../db/schema';

export class UserService {
  private static instance: UserService | null = null;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  public async getUser(id: string): Promise<User | null> {
    return userRepository.findById(id);
  }

  public async listUsers(): Promise<User[]> {
    return userRepository.findAll();
  }

  public async saveUser(user: User): Promise<User> {
    return userRepository.save(user);
  }
}

export const userService = UserService.getInstance();
