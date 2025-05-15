import request from 'supertest';
import app from '../app';
import prisma from '../config/database';

// 测试用户数据
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: '测试用户',
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

describe('认证API', () => {
  let authToken: string;
  
  it('应该能够注册新用户', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.name).toBe(testUser.name);
    
    // 保存令牌用于后续测试
    authToken = response.body.token;
  });
  
  it('应该能够登录', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testUser.email);
  });
  
  it('应该拒绝错误的登录凭据', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });
    
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });
});
