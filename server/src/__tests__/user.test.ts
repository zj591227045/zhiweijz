import request from 'supertest';
import app from '../app';
import prisma from '../config/database';

// 测试用户数据
const testUser = {
  email: 'user-test@example.com',
  password: 'password123',
  name: '用户测试',
};

// 在所有测试开始前清理测试数据
beforeAll(async () => {
  // 删除测试用户（如果存在）
  await prisma.user.deleteMany({
    where: {
      email: testUser.email,
    },
  });
});

// 在所有测试结束后清理测试数据
afterAll(async () => {
  // 删除测试用户
  await prisma.user.deleteMany({
    where: {
      email: testUser.email,
    },
  });

  // 关闭Prisma连接
  await prisma.$disconnect();
});

describe('用户API', () => {
  let userId: string;
  let authToken: string;

  // 在测试前创建用户并获取令牌
  beforeAll(async () => {
    const response = await request(app).post('/api/auth/register').send(testUser);

    userId = response.body.user.id;
    authToken = response.body.token;
  });

  it('应该能够获取用户信息', async () => {
    const response = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(testUser.email);
    expect(response.body.name).toBe(testUser.name);
  });

  it('应该能够更新用户信息', async () => {
    const updatedName = '更新的用户名';

    const response = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: updatedName,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(updatedName);

    // 恢复原始名称
    await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: testUser.name,
      });
  });

  it('应该能够获取所有用户', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
