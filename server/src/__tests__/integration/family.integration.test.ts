import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';
import { generateToken } from '../../utils/jwt';
import { hashPassword } from '../../utils/password';

// 手动定义Role枚举，因为在测试环境中可能无法正确导入
enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

describe('Family API Integration Tests', () => {
  // 测试用户数据
  const testUser1 = {
    id: '',
    email: 'family-test-user1@example.com',
    password: 'Password123!',
    name: 'Family Test User 1',
  };

  const testUser2 = {
    id: '',
    email: 'family-test-user2@example.com',
    password: 'Password123!',
    name: 'Family Test User 2',
  };

  // 测试家庭数据
  const testFamily = {
    id: '',
    name: 'Test Family',
    createdBy: '',
  };

  // 测试邀请数据
  const testInvitation = {
    id: '',
    invitationCode: '',
  };

  // 测试令牌
  let token1: string;
  let token2: string;

  // 在所有测试之前设置测试数据
  beforeAll(async () => {
    // 设置模拟返回值
    // 模拟用户1
    const user1 = {
      id: '11111111-1111-1111-1111-111111111111',
      email: testUser1.email,
      passwordHash: 'hashed-password',
      name: testUser1.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 模拟用户2
    const user2 = {
      id: '22222222-2222-2222-2222-222222222222',
      email: testUser2.email,
      passwordHash: 'hashed-password',
      name: testUser2.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 设置模拟返回值
    prisma.user.create.mockResolvedValueOnce(user1);
    prisma.user.create.mockResolvedValueOnce(user2);

    // 清理测试数据的模拟
    prisma.invitation.deleteMany.mockResolvedValue({ count: 0 });
    prisma.familyMember.deleteMany.mockResolvedValue({ count: 0 });
    prisma.family.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.deleteMany.mockResolvedValue({ count: 0 });

    // 创建测试用户1
    testUser1.id = user1.id;
    token1 = generateToken({ id: user1.id });

    // 创建测试用户2
    testUser2.id = user2.id;
    token2 = generateToken({ id: user2.id });
  });

  // 在所有测试之后清理测试数据
  afterAll(async () => {
    // 清理测试数据
    prisma.invitation.deleteMany.mockResolvedValue({ count: 0 });
    prisma.familyMember.deleteMany.mockResolvedValue({ count: 0 });
    prisma.family.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.deleteMany.mockResolvedValue({ count: 0 });

    // 断开Prisma连接
    prisma.$disconnect.mockResolvedValue(undefined);

    // 重置所有模拟
    jest.clearAllMocks();
  });

  describe('POST /api/families', () => {
    it('should create a new family', async () => {
      // 模拟家庭创建
      const mockFamily = {
        id: '33333333-3333-3333-3333-333333333333',
        name: testFamily.name,
        createdBy: testUser1.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 模拟家庭成员创建
      const mockFamilyMember = {
        id: '44444444-4444-4444-4444-444444444444',
        familyId: mockFamily.id,
        userId: testUser1.id,
        name: testUser1.name,
        role: 'ADMIN',
        isRegistered: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 设置模拟返回值
      prisma.family.create.mockResolvedValueOnce(mockFamily);
      prisma.familyMember.create.mockResolvedValueOnce(mockFamilyMember);
      prisma.family.findUnique.mockResolvedValueOnce({
        ...mockFamily,
        members: [mockFamilyMember],
      });

      const response = await request(app)
        .post('/api/families')
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: testFamily.name });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', testFamily.name);
      expect(response.body).toHaveProperty('createdBy', testUser1.id);
      expect(response.body).toHaveProperty('members');
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0]).toHaveProperty('role', 'ADMIN');

      // 保存测试家庭ID
      testFamily.id = mockFamily.id;
      testFamily.createdBy = mockFamily.createdBy;
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/families')
        .set('Authorization', `Bearer ${token1}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/families')
        .send({ name: 'Unauthorized Family' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/families', () => {
    it("should return user's families", async () => {
      const response = await request(app)
        .get('/api/families')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id', testFamily.id);
      expect(response.body[0]).toHaveProperty('name', testFamily.name);
      expect(response.body[0]).toHaveProperty('memberCount', 1);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/families');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/families/:id', () => {
    it('should return family details for a member', async () => {
      const response = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testFamily.id);
      expect(response.body).toHaveProperty('name', testFamily.name);
      expect(response.body).toHaveProperty('members');
      expect(Array.isArray(response.body.members)).toBe(true);
    });

    it('should return 404 if family does not exist', async () => {
      const response = await request(app)
        .get('/api/families/non-existent-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not a family member', async () => {
      const response = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/families/:id/invitations', () => {
    it('should create an invitation link', async () => {
      const response = await request(app)
        .post(`/api/families/${testFamily.id}/invitations`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ expiresInDays: 7 });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('familyId', testFamily.id);
      expect(response.body).toHaveProperty('invitationCode');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('expiresAt');

      // 保存测试邀请数据
      testInvitation.id = response.body.id;
      testInvitation.invitationCode = response.body.invitationCode;
    });

    it('should return 403 if user is not a family admin', async () => {
      const response = await request(app)
        .post(`/api/families/${testFamily.id}/invitations`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ expiresInDays: 7 });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/families/join', () => {
    it('should allow a user to join a family with a valid invitation code', async () => {
      const response = await request(app)
        .post('/api/families/join')
        .set('Authorization', `Bearer ${token2}`)
        .send({ invitationCode: testInvitation.invitationCode });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('familyId', testFamily.id);
      expect(response.body).toHaveProperty('userId', testUser2.id);
      expect(response.body).toHaveProperty('role', 'MEMBER');
    });

    it('should return 404 if invitation code does not exist', async () => {
      const response = await request(app)
        .post('/api/families/join')
        .set('Authorization', `Bearer ${token2}`)
        .send({ invitationCode: 'non-existent-code' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/families/:id/members', () => {
    it('should add a new family member', async () => {
      const memberName = 'Test Child';
      const response = await request(app)
        .post(`/api/families/${testFamily.id}/members`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: memberName,
          role: 'MEMBER',
          isRegistered: false,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('familyId', testFamily.id);
      expect(response.body).toHaveProperty('name', memberName);
      expect(response.body).toHaveProperty('role', 'MEMBER');
      expect(response.body).toHaveProperty('isRegistered', false);
    });

    it('should return 403 if user is not a family admin', async () => {
      const response = await request(app)
        .post(`/api/families/${testFamily.id}/members`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'Unauthorized Member',
          role: 'MEMBER',
          isRegistered: false,
        });

      expect(response.status).toBe(403);
    });
  });
});
