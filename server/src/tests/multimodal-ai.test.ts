import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MultimodalAIConfigService } from '../services/multimodal-ai-config.service';
import { SpeechRecognitionService } from '../services/speech-recognition.service';
import { VisionRecognitionService } from '../services/vision-recognition.service';
import {
  MultimodalAIError,
  MultimodalAIErrorType,
  DEFAULT_MULTIMODAL_CONFIG,
} from '../models/multimodal-ai.model';

// Mock Prisma
jest.mock('@prisma/client');

describe('MultimodalAIConfigService', () => {
  let configService: MultimodalAIConfigService;

  beforeEach(() => {
    configService = new MultimodalAIConfigService();
  });

  describe('getFullConfig', () => {
    it('should return default config when no database config exists', async () => {
      // Mock empty database response
      const mockPrisma = {
        systemConfig: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      // Replace the prisma instance
      (configService as any).prisma = mockPrisma;

      const config = await configService.getFullConfig();

      expect(config).toEqual(DEFAULT_MULTIMODAL_CONFIG);
    });

    it('should parse database config correctly', async () => {
      const mockConfigs = [
        { key: 'speech_enabled', value: 'true', category: 'ai_multimodal' },
        { key: 'speech_provider', value: 'siliconflow', category: 'ai_multimodal' },
        { key: 'vision_enabled', value: 'false', category: 'ai_multimodal' },
      ];

      const mockPrisma = {
        systemConfig: {
          findMany: jest.fn().mockResolvedValue(mockConfigs),
        },
      };

      (configService as any).prisma = mockPrisma;

      const config = await configService.getFullConfig();

      expect(config.speech.enabled).toBe(true);
      expect(config.speech.provider).toBe('siliconflow');
      expect(config.vision.enabled).toBe(false);
    });
  });

  describe('updateSpeechConfig', () => {
    it('should update speech configuration', async () => {
      const mockPrisma = {
        systemConfig: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      };

      (configService as any).prisma = mockPrisma;

      await configService.updateSpeechConfig({
        enabled: true,
        provider: 'openai',
        model: 'whisper-1',
      });

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledTimes(3);
    });
  });
});

describe('SpeechRecognitionService', () => {
  let speechService: SpeechRecognitionService;
  let mockConfigService: jest.Mocked<MultimodalAIConfigService>;

  beforeEach(() => {
    mockConfigService = {
      getSpeechConfig: jest.fn(),
    } as any;

    speechService = new SpeechRecognitionService();
    (speechService as any).configService = mockConfigService;
  });

  describe('speechToText', () => {
    it('should throw error when speech recognition is disabled', async () => {
      mockConfigService.getSpeechConfig.mockResolvedValue({
        enabled: false,
        provider: 'siliconflow',
        model: 'test-model',
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        maxFileSize: 10485760,
        allowedFormats: ['mp3', 'wav'],
        timeout: 60,
      });

      const mockFile = {
        buffer: Buffer.from('test audio data'),
        originalname: 'test.mp3',
        mimetype: 'audio/mp3',
        size: 1000,
      } as Express.Multer.File;

      const result = await speechService.speechToText({
        audioFile: mockFile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('语音识别功能未启用');
    });

    it('should validate file size', async () => {
      mockConfigService.getSpeechConfig.mockResolvedValue({
        enabled: true,
        provider: 'siliconflow',
        model: 'test-model',
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        maxFileSize: 1000, // 1KB limit
        allowedFormats: ['mp3', 'wav'],
        timeout: 60,
      });

      const mockFile = {
        buffer: Buffer.from('test audio data'),
        originalname: 'test.mp3',
        mimetype: 'audio/mp3',
        size: 2000, // 2KB file
      } as Express.Multer.File;

      const result = await speechService.speechToText({
        audioFile: mockFile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('文件大小超过限制');
    });

    it('should validate file format', async () => {
      mockConfigService.getSpeechConfig.mockResolvedValue({
        enabled: true,
        provider: 'siliconflow',
        model: 'test-model',
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        maxFileSize: 10485760,
        allowedFormats: ['mp3', 'wav'],
        timeout: 60,
      });

      const mockFile = {
        buffer: Buffer.from('test audio data'),
        originalname: 'test.flac', // Unsupported format
        mimetype: 'audio/flac',
        size: 1000,
      } as Express.Multer.File;

      const result = await speechService.speechToText({
        audioFile: mockFile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的音频格式');
    });
  });

  describe('testConnection', () => {
    it('should return false when speech recognition is disabled', async () => {
      mockConfigService.getSpeechConfig.mockResolvedValue({
        enabled: false,
        provider: 'siliconflow',
        model: 'test-model',
        apiKey: '',
        baseUrl: 'https://api.test.com',
        maxFileSize: 10485760,
        allowedFormats: ['mp3', 'wav'],
        timeout: 60,
      });

      const result = await speechService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when API key is missing', async () => {
      mockConfigService.getSpeechConfig.mockResolvedValue({
        enabled: true,
        provider: 'siliconflow',
        model: 'test-model',
        apiKey: '', // Missing API key
        baseUrl: 'https://api.test.com',
        maxFileSize: 10485760,
        allowedFormats: ['mp3', 'wav'],
        timeout: 60,
      });

      const result = await speechService.testConnection();

      expect(result).toBe(false);
    });
  });
});

describe('VisionRecognitionService', () => {
  let visionService: VisionRecognitionService;
  let mockConfigService: jest.Mocked<MultimodalAIConfigService>;

  beforeEach(() => {
    mockConfigService = {
      getVisionConfig: jest.fn(),
    } as any;

    visionService = new VisionRecognitionService();
    (visionService as any).configService = mockConfigService;
  });

  describe('recognizeImage', () => {
    it('should throw error when vision recognition is disabled', async () => {
      mockConfigService.getVisionConfig.mockResolvedValue({
        enabled: false,
        provider: 'siliconflow',
        model: 'test-model',
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        maxFileSize: 10485760,
        allowedFormats: ['jpg', 'png'],
        detailLevel: 'high',
        timeout: 60,
      });

      const mockFile = {
        buffer: Buffer.from('test image data'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      const result = await visionService.recognizeImage({
        imageFile: mockFile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('视觉识别功能未启用');
    });

    it('should require image data', async () => {
      mockConfigService.getVisionConfig.mockResolvedValue({
        enabled: true,
        provider: 'siliconflow',
        model: 'test-model',
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        maxFileSize: 10485760,
        allowedFormats: ['jpg', 'png'],
        detailLevel: 'high',
        timeout: 60,
      });

      const result = await visionService.recognizeImage({
        // No image data provided
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('未提供图片数据');
    });
  });
});

describe('MultimodalAIError', () => {
  it('should create error with correct properties', () => {
    const error = new MultimodalAIError(
      MultimodalAIErrorType.FILE_TOO_LARGE,
      'File size exceeds limit',
      { size: 20000000 }
    );

    expect(error.type).toBe(MultimodalAIErrorType.FILE_TOO_LARGE);
    expect(error.message).toBe('File size exceeds limit');
    expect(error.details).toEqual({ size: 20000000 });
    expect(error.name).toBe('MultimodalAIError');
  });
});

// Integration tests
describe('Multimodal AI Integration', () => {
  it('should handle complete speech recognition workflow', async () => {
    // This would be an integration test that tests the complete workflow
    // from file upload to speech recognition to smart accounting
    // Implementation would depend on test environment setup
  });

  it('should handle complete vision recognition workflow', async () => {
    // This would be an integration test that tests the complete workflow
    // from image upload to vision recognition to smart accounting
    // Implementation would depend on test environment setup
  });
});
