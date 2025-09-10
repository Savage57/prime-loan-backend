/**
 * User Service Tests
 * Comprehensive tests for user management functionality
 */
import { UserService } from '../modules/users/user.service';
import User from '../modules/users/user.model';
import { ConflictError, BadRequestError, UnauthorizedError } from '../exceptions';

describe('UserService', () => {
  describe('createClientAccount', () => {
    const validUserData = {
      email: 'test@example.com',
      name: 'John',
      surname: 'Doe',
      phone: '08012345678',
      bvn: '12345678901',
      password: 'password123',
      nin: '12345678901',
      dob: '01/01/1990',
      pin: '1234'
    };

    it('should create a user successfully with valid data', async () => {
      const user = await UserService.createClientAccount(validUserData);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(validUserData.email);
      expect(user.user_metadata.first_name).toBe(validUserData.name);
      expect(user.role).toBe('user');
      expect(user.status).toBe('active');
    });

    it('should throw BadRequestError for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      
      await expect(UserService.createClientAccount(invalidData))
        .rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for invalid phone number', async () => {
      const invalidData = { ...validUserData, phone: '123456' };
      
      await expect(UserService.createClientAccount(invalidData))
        .rejects.toThrow(BadRequestError);
    });

    it('should throw ConflictError for duplicate email', async () => {
      await UserService.createClientAccount(validUserData);
      
      await expect(UserService.createClientAccount(validUserData))
        .rejects.toThrow(ConflictError);
    });

    it('should throw BadRequestError for invalid BVN length', async () => {
      const invalidData = { ...validUserData, bvn: '123456789' };
      
      await expect(UserService.createClientAccount(invalidData))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await UserService.createClientAccount({
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        phone: '08012345678',
        bvn: '12345678901',
        password: 'password123',
        nin: '12345678901',
        dob: '01/01/1990',
        pin: '1234'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const result = await UserService.login('test@example.com', 'password123');
      
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedError for invalid email', async () => {
      await expect(UserService.login('wrong@example.com', 'password123'))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      await expect(UserService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw BadRequestError for missing credentials', async () => {
      await expect(UserService.login('', 'password123'))
        .rejects.toThrow(BadRequestError);
    });
  });

  describe('update', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await UserService.createClientAccount({
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        phone: '08012345678',
        bvn: '12345678901',
        password: 'password123',
        nin: '12345678901',
        dob: '01/01/1990',
        pin: '1234'
      });
      userId = user._id;
    });

    it('should update allowed fields successfully', async () => {
      const updatedUser = await UserService.update(userId, 'user_metadata.phone', '08087654321');
      
      expect(updatedUser?.user_metadata.phone).toBe('08087654321');
    });

    it('should throw BadRequestError for disallowed fields', async () => {
      await expect(UserService.update(userId, 'role', 'admin'))
        .rejects.toThrow(BadRequestError);
    });
  });
});