import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { generateToken } from '../../utils/jwt';

describe('账本API集成测试', () => {
  let authToken: string;
  let userId: string;
  let accountBookId: string;

  // 在所有测试之前设置测试数据
  beforeAll(async () => {
    // 清理测试数据
    await prisma.accountLLMSetting.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.category.deleteMany();
    await prisma.accountBook.deleteMany();
    await prisma.userSetting.deleteMany();
    await prisma.user.deleteMany();

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-account-book@example.com',
        passwordHash: '$2b$10$7YIj8/iUg1QLH.6P0Rj7aehIwN0q1dAEgQxQfTlKjZjCyxhXNbhum', // 密码: password123
        name: '测试用户',
      },
    });

    userId = user.id;
    authToken = generateToken({ id: userId, email: user.email });
  });

  // 在所有测试之后清理测试数据
  afterAll(async () => {
    await prisma.accountLLMSetting.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.category.deleteMany();
    await prisma.accountBook.deleteMany();
    await prisma.userSetting.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/account-books', () => {
    it('应该创建一个新账本', async () => {
      const response = await request(app)
        .post('/api/v1/account-books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试账本',
          description: '这是一个测试账本',
          isDefault: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('测试账本');
      expect(response.body.description).toBe('这是一个测试账本');
      expect(response.body.isDefault).toBe(true);
      expect(response.body.userId).toBe(userId);

      accountBookId = response.body.id;
    });

    it('未授权用户应该无法创建账本', async () => {
      const response = await request(app)
        .post('/api/v1/account-books')
        .send({
          name: '未授权账本',
          description: '这个账本不应该被创建',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/account-books', () => {
    it('应该返回用户的账本列表', async () => {
      const response = await request(app)
        .get('/api/v1/account-books')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('transactionCount');
      expect(response.body.data[0]).toHaveProperty('categoryCount');
      expect(response.body.data[0]).toHaveProperty('budgetCount');
    });

    it('未授权用户应该无法获取账本列表', async () => {
      const response = await request(app).get('/api/v1/account-books');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/account-books/default', () => {
    it('应该返回用户的默认账本', async () => {
      const response = await request(app)
        .get('/api/v1/account-books/default')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.isDefault).toBe(true);
    });

    it('未授权用户应该无法获取默认账本', async () => {
      const response = await request(app).get('/api/v1/account-books/default');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/account-books/:id', () => {
    it('应该返回指定ID的账本', async () => {
      const response = await request(app)
        .get(`/api/v1/account-books/${accountBookId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', accountBookId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
    });

    it('未授权用户应该无法获取账本详情', async () => {
      const response = await request(app).get(`/api/v1/account-books/${accountBookId}`);
      expect(response.status).toBe(401);
    });

    it('获取不存在的账本应该返回404', async () => {
      const response = await request(app)
        .get('/api/v1/account-books/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/account-books/:id', () => {
    it('应该更新指定ID的账本', async () => {
      const response = await request(app)
        .put(`/api/v1/account-books/${accountBookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '更新后的账本名称',
          description: '更新后的描述',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', accountBookId);
      expect(response.body.name).toBe('更新后的账本名称');
      expect(response.body.description).toBe('更新后的描述');
    });

    it('未授权用户应该无法更新账本', async () => {
      const response = await request(app)
        .put(`/api/v1/account-books/${accountBookId}`)
        .send({
          name: '未授权更新',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/account-books/:id/set-default', () => {
    it('应该将指定ID的账本设为默认', async () => {
      // 先创建一个非默认账本
      const createResponse = await request(app)
        .post('/api/v1/account-books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '非默认账本',
          description: '这是一个非默认账本',
          isDefault: false,
        });

      const newAccountBookId = createResponse.body.id;

      // 将新账本设为默认
      const response = await request(app)
        .post(`/api/v1/account-books/${newAccountBookId}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', newAccountBookId);
      expect(response.body.isDefault).toBe(true);

      // 验证原来的默认账本不再是默认
      const oldDefaultResponse = await request(app)
        .get(`/api/v1/account-books/${accountBookId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(oldDefaultResponse.body.isDefault).toBe(false);
    });

    it('未授权用户应该无法设置默认账本', async () => {
      const response = await request(app).post(`/api/v1/account-books/${accountBookId}/set-default`);
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/account-books/:id/llm-settings', () => {
    it('应该更新账本的LLM设置', async () => {
      const response = await request(app)
        .put(`/api/v1/account-books/${accountBookId}/llm-settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accountBookId', accountBookId);
      expect(response.body.provider).toBe('openai');
      expect(response.body.model).toBe('gpt-4');
      expect(response.body.temperature).toBe(0.7);
      expect(response.body.maxTokens).toBe(2000);
    });

    it('未授权用户应该无法更新LLM设置', async () => {
      const response = await request(app)
        .put(`/api/v1/account-books/${accountBookId}/llm-settings`)
        .send({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/account-books/:id/llm-settings', () => {
    it('应该获取账本的LLM设置', async () => {
      const response = await request(app)
        .get(`/api/v1/account-books/${accountBookId}/llm-settings`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accountBookId', accountBookId);
      expect(response.body).toHaveProperty('provider');
      expect(response.body).toHaveProperty('model');
    });

    it('未授权用户应该无法获取LLM设置', async () => {
      const response = await request(app).get(`/api/v1/account-books/${accountBookId}/llm-settings`);
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/account-books/:id', () => {
    it('应该删除非默认账本', async () => {
      // 创建一个非默认账本用于删除测试
      const createResponse = await request(app)
        .post('/api/v1/account-books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '待删除账本',
          description: '这个账本将被删除',
          isDefault: false,
        });

      const deleteAccountBookId = createResponse.body.id;

      // 删除账本
      const response = await request(app)
        .delete(`/api/v1/account-books/${deleteAccountBookId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // 验证账本已被删除
      const getResponse = await request(app)
        .get(`/api/v1/account-books/${deleteAccountBookId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('不应该删除默认账本', async () => {
      // 获取当前默认账本
      const defaultResponse = await request(app)
        .get('/api/v1/account-books/default')
        .set('Authorization', `Bearer ${authToken}`);

      const defaultAccountBookId = defaultResponse.body.id;

      // 尝试删除默认账本
      const response = await request(app)
        .delete(`/api/v1/account-books/${defaultAccountBookId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '不能删除默认账本');
    });

    it('未授权用户应该无法删除账本', async () => {
      const response = await request(app).delete(`/api/v1/account-books/${accountBookId}`);
      expect(response.status).toBe(401);
    });
  });
});
