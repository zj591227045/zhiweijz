import request from 'supertest';
import { Express } from 'express';
import expressApp from '../../src/app';
import { setupTestEnvironment, teardownTestEnvironment, testUserToken } from './setup';
import { UserSettingKey } from '../../src/models/user-setting.model';

describe('User Setting API', () => {
  let app: Express;

  beforeAll(async () => {
    try {
      // 设置测试环境
      await setupTestEnvironment();

      // 使用Express应用
      app = expressApp;

      console.log('Using test user ID:', testUserId);
    } catch (error) {
      console.error('Failed to setup test environment:', error);
      throw error; // 如果测试环境设置失败，则中止测试
    }
  });

  afterAll(async () => {
    // 清理测试环境
    await teardownTestEnvironment();
  });

  describe('POST /api/user-settings/initialize', () => {
    it('should initialize default settings', async () => {
      const response = await request(app)
        .post('/api/user-settings/initialize')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('初始化');
    });
  });

  describe('GET /api/user-settings', () => {
    it('should get all user settings', async () => {
      const response = await request(app)
        .get('/api/user-settings')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('key');
      expect(response.body[0]).toHaveProperty('value');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/user-settings')
        .expect(401);
    });
  });

  describe('POST /api/user-settings', () => {
    it('should create a new setting', async () => {
      const settingData = {
        key: UserSettingKey.THEME,
        value: 'dark',
      };

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(settingData)
        .expect(200);

      expect(response.body).toHaveProperty('key', settingData.key);
      expect(response.body).toHaveProperty('value', settingData.value);
    });

    it('should return 400 with invalid setting key', async () => {
      const settingData = {
        key: 'invalid-key',
        value: 'some-value',
      };

      const response = await request(app)
        .post('/api/user-settings')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(settingData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('无效');
    });
  });

  describe('GET /api/user-settings/:key', () => {
    it('should get a specific setting', async () => {
      const response = await request(app)
        .get(`/api/user-settings/${UserSettingKey.THEME}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('key', UserSettingKey.THEME);
      expect(response.body).toHaveProperty('value');
    });

    it('should return 404 for non-existent setting', async () => {
      // 使用一个有效但可能不存在的设置键
      const response = await request(app)
        .get(`/api/user-settings/${UserSettingKey.DATE_FORMAT}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('PUT /api/user-settings/:key', () => {
    it('should update a setting', async () => {
      const updateData = {
        value: 'light',
      };

      const response = await request(app)
        .put(`/api/user-settings/${UserSettingKey.THEME}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('key', UserSettingKey.THEME);
      expect(response.body).toHaveProperty('value', updateData.value);
    });
  });

  describe('POST /api/user-settings/batch', () => {
    it('should batch update settings', async () => {
      const batchData = {
        settings: [
          { key: UserSettingKey.THEME, value: 'dark' },
          { key: UserSettingKey.LANGUAGE, value: 'en-US' },
        ],
      };

      const response = await request(app)
        .post('/api/user-settings/batch')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(batchData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('更新');
    });
  });
});
