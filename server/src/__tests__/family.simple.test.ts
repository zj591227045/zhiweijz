import { FamilyService } from '../services/family.service';
import { FamilyRepository } from '../repositories/family.repository';
import { UserRepository } from '../repositories/user.repository';

// 定义角色枚举
enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

// 模拟依赖
jest.mock('../repositories/family.repository');
jest.mock('../repositories/user.repository');

describe('FamilyService', () => {
  let familyService: FamilyService;
  let familyRepository: jest.Mocked<FamilyRepository>;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();

    // 创建模拟的仓库
    familyRepository = new FamilyRepository() as jest.Mocked<FamilyRepository>;
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;

    // 替换服务中的仓库
    familyService = new FamilyService();
    (familyService as any).familyRepository = familyRepository;
    (familyService as any).userRepository = userRepository;
  });

  describe('createFamily', () => {
    it('should create a family and add creator as admin member', async () => {
      // 准备测试数据
      const userId = 'test-user-id';
      const familyData = { name: 'Test Family' };

      // 模拟用户
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        bio: null,
        birthDate: null,
        passwordChangedAt: null,
        isCustodial: false,
        isActive: true,
        dailyLlmTokenLimit: null,
        deletionRequestedAt: null,
        deletionScheduledAt: null,
      };

      // 模拟家庭
      const mockFamily = {
        id: 'test-family-id',
        name: familyData.name,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 模拟家庭成员
      const mockFamilyMember = {
        id: 'test-member-id',
        familyId: mockFamily.id,
        userId,
        name: 'Test User',
        role: Role.ADMIN,
        isRegistered: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        birthDate: null,
        gender: null,
        isCustodial: false,
      };

      // 设置模拟返回值
      userRepository.findById.mockResolvedValue(mockUser);
      familyRepository.createFamily.mockResolvedValue(mockFamily);
      familyRepository.createFamilyMember.mockResolvedValue(mockFamilyMember);

      // 调用服务方法
      const result = await familyService.createFamily(userId, familyData);

      // 验证结果
      expect(result).toBeDefined();
      expect(result.id).toBe(mockFamily.id);
      expect(result.name).toBe(mockFamily.name);
      expect(result.createdBy).toBe(userId);
      expect(result.members).toBeDefined();
      if (result.members) {
        expect(result.members.length).toBe(1);
        expect(result.members[0].role).toBe(Role.ADMIN);
      }

      // 验证仓库方法调用
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(familyRepository.createFamily).toHaveBeenCalledWith(userId, familyData.name);
      expect(familyRepository.createFamilyMember).toHaveBeenCalledWith({
        familyId: mockFamily.id,
        userId,
        name: mockUser.name,
        role: Role.ADMIN,
        isRegistered: true,
      });
    });
  });

  describe('isUserFamilyMember', () => {
    it('should return true if user is a family member', async () => {
      // 准备测试数据
      const userId = 'test-user-id';
      const familyId = 'test-family-id';

      // 模拟仓库方法
      const mockFamilyMember = {
        id: 'test-member-id',
        familyId,
        userId,
        name: 'Test User',
        role: Role.MEMBER,
        isRegistered: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        birthDate: null,
        gender: null,
        isCustodial: false,
      };

      familyRepository.findFamilyMemberByUserAndFamily.mockResolvedValue(mockFamilyMember);

      // 调用服务方法
      const result = await familyService.isUserFamilyMember(userId, familyId);

      // 验证结果
      expect(result).toBe(true);

      // 验证仓库方法调用
      expect(familyRepository.findFamilyMemberByUserAndFamily).toHaveBeenCalledWith(
        userId,
        familyId,
      );
    });

    it('should return false if user is not a family member', async () => {
      // 准备测试数据
      const userId = 'test-user-id';
      const familyId = 'test-family-id';

      // 模拟仓库方法
      familyRepository.findFamilyMemberByUserAndFamily.mockResolvedValue(null);

      // 调用服务方法
      const result = await familyService.isUserFamilyMember(userId, familyId);

      // 验证结果
      expect(result).toBe(false);

      // 验证仓库方法调用
      expect(familyRepository.findFamilyMemberByUserAndFamily).toHaveBeenCalledWith(
        userId,
        familyId,
      );
    });
  });
});
