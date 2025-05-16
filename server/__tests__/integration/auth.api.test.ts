import request from 'supertest';
import { Express } from 'express';
import expressApp from '../../src/app';
import { setupTestEnvironment, teardownTestEnvironment, testUser } from './setup';

describe('Auth API', () => {
  let app: Express;

  beforeAll(async () => {
    try {
      // 设置测试环境
      await setupTestEnvironment();

      // 使用Express应用
      app = expressApp;

      console.log('Using test user ID:', testUserId);
      console.log('Using test user email:', testUser.email);
    } catch (error) {
      console.error('Failed to setup test environment:', error);
      throw error; // 如果测试环境设置失败，则中止测试
    }
  });

  afterAll(async () => {
    // 清理测试环境
    await teardownTestEnvironment();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', newUser.email);
      expect(response.body).toHaveProperty('name', newUser.name);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 400 if email already exists', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('已存在');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('无效');
    });

    it('should return 401 with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('无效');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testUser.email,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('已发送');
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('已发送');
    });
  });

  // 注意：重置密码API需要有效的令牌，这在集成测试中很难测试
  // 因为令牌是通过邮件发送的，我们可以在单元测试中测试这个功能
});
