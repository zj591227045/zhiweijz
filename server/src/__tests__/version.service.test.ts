import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { versionService } from '../services/version.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Version Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isVersionCheckEnabled', () => {
    it('should return false when environment variable is not set', async () => {
      process.env.ENABLE_VERSION_MANAGEMENT = 'false';
      
      const result = await versionService.isVersionCheckEnabled();
      expect(result).toBe(false);
    });

    it('should check database config when environment variable is true', async () => {
      process.env.ENABLE_VERSION_MANAGEMENT = 'true';
      
      (mockPrisma.versionConfig.findUnique as jest.Mock).mockResolvedValue({
        key: 'version_check_enabled',
        value: 'true'
      });

      const result = await versionService.isVersionCheckEnabled();
      expect(result).toBe(true);
    });
  });

  describe('getLatestVersion', () => {
    it('should return latest version for given platform', async () => {
      const mockVersion = {
        id: '1',
        platform: 'WEB',
        version: '1.0.0',
        buildNumber: 1,
        versionCode: 1000,
        isEnabled: true,
        publishedAt: new Date(),
        isForceUpdate: false
      };

      (mockPrisma.appVersion.findFirst as jest.Mock).mockResolvedValue(mockVersion);

      const result = await versionService.getLatestVersion('web');
      expect(result).toEqual(mockVersion);
    });

    it('should return null when no version found', async () => {
      (mockPrisma.appVersion.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await versionService.getLatestVersion('web');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion', () => {
    it('should return hasUpdate false when no latest version', async () => {
      process.env.ENABLE_VERSION_MANAGEMENT = 'true';
      
      (mockPrisma.versionConfig.findUnique as jest.Mock).mockResolvedValue({
        key: 'version_check_enabled',
        value: 'true'
      });

      (mockPrisma.appVersion.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.versionCheckLog.create as jest.Mock).mockResolvedValue({});

      const result = await versionService.checkVersion({
        platform: 'web',
        currentVersion: '1.0.0',
        currentBuildNumber: 1
      });

      expect(result.hasUpdate).toBe(false);
    });

    it('should return hasUpdate true when version is newer', async () => {
      process.env.ENABLE_VERSION_MANAGEMENT = 'true';
      
      (mockPrisma.versionConfig.findUnique as jest.Mock).mockResolvedValue({
        key: 'version_check_enabled',
        value: 'true'
      });

      const mockLatestVersion = {
        id: '1',
        platform: 'WEB',
        version: '1.1.0',
        buildNumber: 2,
        versionCode: 1100,
        isEnabled: true,
        publishedAt: new Date(),
        isForceUpdate: false,
        releaseNotes: 'New features added'
      };

      (mockPrisma.appVersion.findFirst as jest.Mock).mockResolvedValue(mockLatestVersion);
      (mockPrisma.versionCheckLog.create as jest.Mock).mockResolvedValue({});

      const result = await versionService.checkVersion({
        platform: 'web',
        currentVersion: '1.0.0',
        currentBuildNumber: 1
      });

      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toEqual(mockLatestVersion);
    });

    it('should throw error when version check is disabled', async () => {
      process.env.ENABLE_VERSION_MANAGEMENT = 'false';

      await expect(versionService.checkVersion({
        platform: 'web',
        currentVersion: '1.0.0',
        currentBuildNumber: 1
      })).rejects.toThrow('版本检查功能未启用');
    });
  });

  describe('createVersion', () => {
    it('should create new version successfully', async () => {
      const mockVersion = {
        id: '1',
        platform: 'WEB',
        version: '1.0.0',
        buildNumber: 1,
        versionCode: 1000,
        isEnabled: true,
        publishedAt: new Date(),
        isForceUpdate: false
      };

      (mockPrisma.appVersion.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.appVersion.create as jest.Mock).mockResolvedValue(mockVersion);

      const result = await versionService.createVersion({
        platform: 'web',
        version: '1.0.0',
        buildNumber: 1,
        versionCode: 1000,
        publishNow: true
      });

      expect(result).toEqual(mockVersion);
    });

    it('should throw error when version already exists', async () => {
      (mockPrisma.appVersion.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        platform: 'WEB',
        version: '1.0.0'
      });

      await expect(versionService.createVersion({
        platform: 'web',
        version: '1.0.0',
        buildNumber: 1,
        versionCode: 1000
      })).rejects.toThrow('该版本已存在');
    });
  });

  describe('updateVersion', () => {
    it('should update version successfully', async () => {
      const existingVersion = {
        id: '1',
        platform: 'WEB',
        version: '1.0.0',
        versionCode: 1000
      };

      const updatedVersion = {
        ...existingVersion,
        version: '1.0.1',
        versionCode: 1001
      };

      (mockPrisma.appVersion.findUnique as jest.Mock).mockResolvedValue(existingVersion);
      (mockPrisma.appVersion.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.appVersion.update as jest.Mock).mockResolvedValue(updatedVersion);

      const result = await versionService.updateVersion('1', {
        version: '1.0.1',
        versionCode: 1001
      });

      expect(result).toEqual(updatedVersion);
    });

    it('should throw error when version not found', async () => {
      (mockPrisma.appVersion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(versionService.updateVersion('1', {
        version: '1.0.1'
      })).rejects.toThrow('版本不存在');
    });
  });

  describe('publishVersion', () => {
    it('should publish version successfully', async () => {
      const publishedVersion = {
        id: '1',
        platform: 'WEB',
        version: '1.0.0',
        isEnabled: true,
        publishedAt: new Date()
      };

      (mockPrisma.appVersion.update as jest.Mock).mockResolvedValue(publishedVersion);

      const result = await versionService.publishVersion('1');

      expect(result).toEqual(publishedVersion);
      expect(mockPrisma.appVersion.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          publishedAt: expect.any(Date),
          isEnabled: true
        }
      });
    });
  });

  describe('getVersionStats', () => {
    it('should return version statistics', async () => {
      (mockPrisma.appVersion.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.appVersion.groupBy as jest.Mock).mockResolvedValue([
        { platform: 'WEB', _count: { id: 2 } },
        { platform: 'IOS', _count: { id: 2 } },
        { platform: 'ANDROID', _count: { id: 1 } }
      ]);

      const mockLatestVersions = [
        { id: '1', platform: 'WEB', version: '1.0.0' },
        { id: '2', platform: 'IOS', version: '1.0.0' },
        { id: '3', platform: 'ANDROID', version: '1.0.0' }
      ];

      (mockPrisma.appVersion.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockLatestVersions[0])
        .mockResolvedValueOnce(mockLatestVersions[1])
        .mockResolvedValueOnce(mockLatestVersions[2]);

      const result = await versionService.getVersionStats();

      expect(result.totalVersions).toBe(5);
      expect(result.platformStats).toEqual({
        WEB: 2,
        IOS: 2,
        ANDROID: 1
      });
    });
  });
});