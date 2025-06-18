import request from 'supertest';
import { Express } from 'express';
import expressApp from '../../src/app';
import { setupTestEnvironment, teardownTestEnvironment, testUserToken, testCategoryId } from './setup';
import { TransactionType } from '@prisma/client';

describe('Category API', () => {
  let app: Express;
  let createdCategoryId: string;

  beforeAll(async () => {
    try {
      // 设置测试环境
      await setupTestEnvironment();

      // 使用Express应用
      app = expressApp;

      // 使用测试分类ID
      createdCategoryId = testCategoryId;

      console.log('Using test category ID:', testCategoryId);
    } catch (error) {
      console.error('Failed to setup test environment:', error);
      throw error; // 如果测试环境设置失败，则中止测试
    }
  });

  afterAll(async () => {
    // 清理测试环境
    await teardownTestEnvironment();
  });

  describe('POST /api/categories/initialize', () => {
    it('should initialize default categories', async () => {
      const response = await request(app)
        .post('/api/categories/initialize')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('初始化');
    });
  });

  describe('GET /api/categories', () => {
    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('type');
    });

    it('should filter categories by type', async () => {
      const response = await request(app)
        .get('/api/categories')
        .query({ type: TransactionType.EXPENSE })
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('type', TransactionType.EXPENSE);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/categories')
        .expect(401);
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Test Custom Category',
        type: TransactionType.EXPENSE,
        icon: 'custom-icon',
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', categoryData.name);
      expect(response.body).toHaveProperty('type', categoryData.type);
      expect(response.body).toHaveProperty('icon', categoryData.icon);

      createdCategoryId = response.body.id;
    });

    it('should return 400 with invalid data', async () => {
      const invalidData = {
        name: 'Invalid Category',
        // 缺少必填字段type
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should get a specific category', async () => {
      const response = await request(app)
        .get(`/api/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testCategoryId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('type');
    });

    it('should return 404 for non-existent category', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/categories/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update a category', async () => {
      const updateData = {
        name: 'Updated Category Name',
        icon: 'updated-icon',
      };

      const response = await request(app)
        .put(`/api/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdCategoryId);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('icon', updateData.icon);
    });

    it('should return 400 when trying to update default category', async () => {
      // 获取一个默认分类
      const categoriesResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      const defaultCategory = categoriesResponse.body.find((cat: any) => cat.isDefault);

      if (defaultCategory) {
        const updateData = {
          name: 'Try Update Default',
        };

        const response = await request(app)
          .put(`/api/categories/${defaultCategory.id}`)
          .set('Authorization', `Bearer ${testUserToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('默认分类不能修改');
      }
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      await request(app)
        .delete(`/api/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(204);

      // 验证分类已被删除
      await request(app)
        .get(`/api/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
    });

    it('should return 400 when trying to delete default category', async () => {
      // 获取一个默认分类
      const categoriesResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      const defaultCategory = categoriesResponse.body.find((cat: any) => cat.isDefault);

      if (defaultCategory) {
        const response = await request(app)
          .delete(`/api/categories/${defaultCategory.id}`)
          .set('Authorization', `Bearer ${testUserToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('默认分类不能删除');
      }
    });
  });
});
