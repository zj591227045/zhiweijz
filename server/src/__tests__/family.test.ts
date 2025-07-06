import { FamilyService } from '../services/family.service';
import { FamilyRepository } from '../repositories/family.repository';
import { UserRepository } from '../repositories/user.repository';

// 手动定义Role枚举，因为在测试环境中可能无法正确导入
enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

// 模拟依赖
jest.mock('../repositories/family.repository');
jest.mock('../repositories/user.repository');

describe('FamilyService', () => {
  let familyService: FamilyService;
  let mockFamilyRepository: jest.Mocked<FamilyRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();

    // 创建模拟实例
    mockFamilyRepository = {
      createFamily: jest.fn(),
      findFamilyById: jest.fn(),
      findFamiliesByCreatorId: jest.fn(),
      findFamiliesByMemberId: jest.fn(),
      findAllFamiliesByUserId: jest.fn(),
      updateFamily: jest.fn(),
      deleteFamily: jest.fn(),
      createFamilyMember: jest.fn(),
      findFamilyMemberById: jest.fn(),
      findFamilyMemberByUserAndFamily: jest.fn(),
      findFamilyMembers: jest.fn(),
      updateFamilyMember: jest.fn(),
      deleteFamilyMember: jest.fn(),
      createInvitation: jest.fn(),
      findInvitationByCode: jest.fn(),
      deleteInvitation: jest.fn(),
    } as unknown as jest.Mocked<FamilyRepository>;

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    // 模拟FamilyService中的依赖注入
    jest.mock('../repositories/family.repository', () => ({
      FamilyRepository: jest.fn().mockImplementation(() => mockFamilyRepository),
    }));

    jest.mock('../repositories/user.repository', () => ({
      UserRepository: jest.fn().mockImplementation(() => mockUserRepository),
    }));

    // 创建服务实例
    familyService = new FamilyService();

    // 手动设置服务实例的仓库
    (familyService as any).familyRepository = mockFamilyRepository;
    (familyService as any).userRepository = mockUserRepository;
  });

  describe('createFamily', () => {
    it('should create a family and add creator as admin member', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const familyData = { name: 'Test Family' };
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockFamily = {
        id: 'family-id',
        name: familyData.name,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockMember = {
        id: 'member-id',
        familyId: mockFamily.id,
        userId,
        name: mockUser.name,
        role: Role.ADMIN,
        isRegistered: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 设置模拟行为
      mockUserRepository.findById = jest.fn().mockResolvedValue(mockUser);
      mockFamilyRepository.createFamily = jest.fn().mockResolvedValue(mockFamily);
      mockFamilyRepository.createFamilyMember = jest.fn().mockResolvedValue(mockMember);

      // 调用被测试的方法
      const result = await familyService.createFamily(userId, familyData);

      // 验证结果
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockFamilyRepository.createFamily).toHaveBeenCalledWith(userId, familyData.name);
      expect(mockFamilyRepository.createFamilyMember).toHaveBeenCalledWith({
        familyId: mockFamily.id,
        userId,
        name: mockUser.name,
        role: Role.ADMIN,
        isRegistered: true,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockFamily.id,
          name: mockFamily.name,
          createdBy: mockFamily.createdBy,
          members: expect.arrayContaining([
            expect.objectContaining({
              id: mockMember.id,
              familyId: mockMember.familyId,
              userId: mockMember.userId,
              name: mockMember.name,
              role: mockMember.role,
            }),
          ]),
        }),
      );
    });

    it('should throw an error if user does not exist', async () => {
      // 准备测试数据
      const userId = 'non-existent-user-id';
      const familyData = { name: 'Test Family' };

      // 设置模拟行为
      mockUserRepository.findById = jest.fn().mockResolvedValue(null);
      mockFamilyRepository.createFamily = jest.fn().mockResolvedValue({
        id: 'family-id',
        name: familyData.name,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 调用被测试的方法并验证异常
      await expect(familyService.createFamily(userId, familyData)).rejects.toThrow('用户不存在');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockFamilyRepository.createFamily).toHaveBeenCalledWith(userId, familyData.name);
      expect(mockFamilyRepository.createFamilyMember).not.toHaveBeenCalled();
    });
  });

  describe('getFamiliesByUserId', () => {
    it('should return a list of families for the user', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const mockFamilies = [
        {
          id: 'family-id-1',
          name: 'Family 1',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'family-id-2',
          name: 'Family 2',
          createdBy: 'other-user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockMembers = [
        {
          id: 'member-id-1',
          familyId: 'family-id-1',
          userId,
          name: 'User Name',
          role: Role.ADMIN,
          isRegistered: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'member-id-2',
          familyId: 'family-id-2',
          userId,
          name: 'User Name',
          role: Role.MEMBER,
          isRegistered: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockUser = {
        id: userId,
        name: 'User Name',
        email: 'user@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 设置模拟行为
      mockFamilyRepository.findAllFamiliesByUserId = jest.fn().mockResolvedValue(mockFamilies);
      mockFamilyRepository.findFamilyMembers = jest.fn().mockImplementation((familyId) => {
        return Promise.resolve(mockMembers.filter((m) => m.familyId === familyId));
      });
      mockUserRepository.findById = jest.fn().mockResolvedValue(mockUser);

      // 调用被测试的方法
      const result = await familyService.getFamiliesByUserId(userId);

      // 验证结果
      expect(mockFamilyRepository.findAllFamiliesByUserId).toHaveBeenCalledWith(userId);
      expect(mockFamilyRepository.findFamilyMembers).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: mockFamilies[0].id,
          name: mockFamilies[0].name,
          createdBy: mockFamilies[0].createdBy,
          memberCount: 1,
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          id: mockFamilies[1].id,
          name: mockFamilies[1].name,
          createdBy: mockFamilies[1].createdBy,
          memberCount: 1,
        }),
      );
    });
  });

  describe('getFamilyById', () => {
    it('should return family details for a member', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const familyId = 'family-id';
      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        createdBy: 'creator-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member-id',
            familyId,
            userId,
            name: 'User Name',
            role: Role.MEMBER,
            isRegistered: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const mockCreator = {
        id: 'creator-id',
        name: 'Creator Name',
        email: 'creator@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 设置模拟行为
      mockFamilyRepository.findFamilyById = jest.fn().mockResolvedValue(mockFamily);
      // 模拟isUserFamilyMember方法
      jest.spyOn(familyService, 'isUserFamilyMember' as any).mockResolvedValue(true);
      mockUserRepository.findById = jest.fn().mockResolvedValue(mockCreator);

      // 调用被测试的方法
      const result = await familyService.getFamilyById(familyId, userId);

      // 验证结果
      expect(mockFamilyRepository.findFamilyById).toHaveBeenCalledWith(familyId);
      expect((familyService as any).isUserFamilyMember).toHaveBeenCalledWith(userId, familyId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFamily.createdBy);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockFamily.id,
          name: mockFamily.name,
          createdBy: mockFamily.createdBy,
          creator: expect.objectContaining({
            id: mockCreator.id,
            name: mockCreator.name,
            email: mockCreator.email,
          }),
          members: expect.arrayContaining([
            expect.objectContaining({
              id: mockFamily.members[0].id,
              familyId: mockFamily.members[0].familyId,
              userId: mockFamily.members[0].userId,
              name: mockFamily.members[0].name,
              role: mockFamily.members[0].role,
            }),
          ]),
        }),
      );
    });

    it('should throw an error if family does not exist', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const familyId = 'non-existent-family-id';

      // 设置模拟行为
      mockFamilyRepository.findFamilyById = jest.fn().mockResolvedValue(null);

      // 调用被测试的方法并验证异常
      await expect(familyService.getFamilyById(familyId, userId)).rejects.toThrow('家庭不存在');
      expect(mockFamilyRepository.findFamilyById).toHaveBeenCalledWith(familyId);
    });

    it('should throw an error if user is not a family member', async () => {
      // 准备测试数据
      const userId = 'non-member-user-id';
      const familyId = 'family-id';
      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        createdBy: 'creator-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      // 设置模拟行为
      mockFamilyRepository.findFamilyById = jest.fn().mockResolvedValue(mockFamily);
      // 模拟isUserFamilyMember方法
      jest.spyOn(familyService, 'isUserFamilyMember' as any).mockResolvedValue(false);

      // 调用被测试的方法并验证异常
      await expect(familyService.getFamilyById(familyId, userId)).rejects.toThrow('无权访问此家庭');
      expect(mockFamilyRepository.findFamilyById).toHaveBeenCalledWith(familyId);
      expect((familyService as any).isUserFamilyMember).toHaveBeenCalledWith(userId, familyId);
    });
  });

  describe('createInvitation', () => {
    it('should create an invitation for a family', async () => {
      // 准备测试数据
      const userId = 'admin-user-id';
      const familyId = 'family-id';
      const invitationData = { expiresInDays: 5 };
      const baseUrl = 'https://example.com';
      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };
      const mockInvitation = {
        id: 'invitation-id',
        familyId,
        invitationCode: 'unique-code',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      // 设置模拟行为
      mockFamilyRepository.findFamilyById = jest.fn().mockResolvedValue(mockFamily);
      // 模拟isUserFamilyAdmin方法
      jest.spyOn(familyService, 'isUserFamilyAdmin' as any).mockResolvedValue(true);
      mockFamilyRepository.createInvitation = jest.fn().mockResolvedValue(mockInvitation);

      // 调用被测试的方法
      const result = await familyService.createInvitation(
        familyId,
        userId,
        invitationData,
        baseUrl,
      );

      // 验证结果
      expect(mockFamilyRepository.findFamilyById).toHaveBeenCalledWith(familyId);
      expect((familyService as any).isUserFamilyAdmin).toHaveBeenCalledWith(userId, familyId);
      expect(mockFamilyRepository.createInvitation).toHaveBeenCalledWith(
        familyId,
        expect.any(String),
        expect.any(Date),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: mockInvitation.id,
          familyId: mockInvitation.familyId,
          invitationCode: mockInvitation.invitationCode,
          expiresAt: mockInvitation.expiresAt,
          url: `${baseUrl}/join?code=${mockInvitation.invitationCode}`,
        }),
      );
    });

    it('should throw an error if user is not a family admin', async () => {
      // 准备测试数据
      const userId = 'non-admin-user-id';
      const familyId = 'family-id';
      const invitationData = { expiresInDays: 5 };
      const baseUrl = 'https://example.com';
      const mockFamily = {
        id: familyId,
        name: 'Test Family',
        createdBy: 'other-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      // 设置模拟行为
      mockFamilyRepository.findFamilyById = jest.fn().mockResolvedValue(mockFamily);
      // 模拟isUserFamilyAdmin方法
      jest.spyOn(familyService, 'isUserFamilyAdmin' as any).mockResolvedValue(false);

      // 调用被测试的方法并验证异常
      await expect(
        familyService.createInvitation(familyId, userId, invitationData, baseUrl),
      ).rejects.toThrow('无权创建邀请链接');
      expect(mockFamilyRepository.findFamilyById).toHaveBeenCalledWith(familyId);
      expect((familyService as any).isUserFamilyAdmin).toHaveBeenCalledWith(userId, familyId);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept an invitation and add user as family member', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const invitationData = { invitationCode: 'valid-code' };
      const mockInvitation = {
        id: 'invitation-id',
        familyId: 'family-id',
        invitationCode: 'valid-code',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 未过期
        createdAt: new Date(),
        family: {
          id: 'family-id',
          name: 'Test Family',
          createdBy: 'creator-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      const mockUser = {
        id: userId,
        name: 'User Name',
        email: 'user@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockMember = {
        id: 'member-id',
        familyId: 'family-id',
        userId,
        name: mockUser.name,
        role: Role.MEMBER,
        isRegistered: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 设置模拟行为
      mockFamilyRepository.findInvitationByCode = jest.fn().mockResolvedValue(mockInvitation);
      mockUserRepository.findById = jest.fn().mockResolvedValue(mockUser);
      mockFamilyRepository.findFamilyMemberByUserAndFamily = jest.fn().mockResolvedValue(null);
      mockFamilyRepository.createFamilyMember = jest.fn().mockResolvedValue(mockMember);
      mockFamilyRepository.deleteInvitation = jest.fn().mockResolvedValue({});

      // 调用被测试的方法
      const result = await familyService.acceptInvitation(userId, invitationData);

      // 验证结果
      expect(mockFamilyRepository.findInvitationByCode).toHaveBeenCalledWith(
        invitationData.invitationCode,
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockFamilyRepository.findFamilyMemberByUserAndFamily).toHaveBeenCalledWith(
        userId,
        mockInvitation.familyId,
      );
      expect(mockFamilyRepository.createFamilyMember).toHaveBeenCalledWith({
        familyId: mockInvitation.familyId,
        userId,
        name: mockUser.name,
        role: Role.MEMBER,
        isRegistered: true,
      });
      expect(mockFamilyRepository.deleteInvitation).toHaveBeenCalledWith(mockInvitation.id);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockMember.id,
          familyId: mockMember.familyId,
          userId: mockMember.userId,
          name: mockMember.name,
          role: mockMember.role,
        }),
      );
    });

    it('should throw an error if invitation does not exist', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const invitationData = { invitationCode: 'invalid-code' };

      // 设置模拟行为
      mockFamilyRepository.findInvitationByCode = jest.fn().mockResolvedValue(null);

      // 调用被测试的方法并验证异常
      await expect(familyService.acceptInvitation(userId, invitationData)).rejects.toThrow(
        '邀请不存在或已过期',
      );
      expect(mockFamilyRepository.findInvitationByCode).toHaveBeenCalledWith(
        invitationData.invitationCode,
      );
    });

    it('should throw an error if invitation has expired', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const invitationData = { invitationCode: 'expired-code' };
      const mockInvitation = {
        id: 'invitation-id',
        familyId: 'family-id',
        invitationCode: 'expired-code',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 已过期
        createdAt: new Date(),
        family: {
          id: 'family-id',
          name: 'Test Family',
          createdBy: 'creator-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      // 设置模拟行为
      mockFamilyRepository.findInvitationByCode = jest.fn().mockResolvedValue(mockInvitation);

      // 调用被测试的方法并验证异常
      await expect(familyService.acceptInvitation(userId, invitationData)).rejects.toThrow(
        '邀请已过期',
      );
      expect(mockFamilyRepository.findInvitationByCode).toHaveBeenCalledWith(
        invitationData.invitationCode,
      );
    });
  });
});
