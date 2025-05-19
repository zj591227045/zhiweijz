/**
 * 测试前端邀请列表功能
 */

// 模拟API客户端
const apiClient = {
  get: async (url) => {
    console.log(`GET 请求: ${url}`);
    
    // 模拟邀请列表数据
    if (url.includes('/families/') && url.includes('/invitations')) {
      console.log('返回邀请列表数据');
      
      // 返回两条邀请记录
      return [
        {
          id: 'e0662ce8-a45f-4e87-8ac3-08cfd376daa7',
          familyId: 'f05fdb3d-838b-4b14-8a12-87b55c4c0c2b',
          invitationCode: 'ee1e09c1-179f-4132-9d7f-076e4f79ebc8',
          expiresAt: '2025-05-26T08:46:29.000Z',
          url: 'http://localhost:3000/join?code=ee1e09c1-179f-4132-9d7f-076e4f79ebc8',
          createdAt: '2025-05-19T08:46:29.000Z',
          isUsed: false
        },
        {
          id: '620434b3-b01a-4112-a8ed-f9abc81d1184',
          familyId: 'f05fdb3d-838b-4b14-8a12-87b55c4c0c2b',
          invitationCode: '0ddf674a-5e88-44dc-9a99-fd564ef2161d',
          expiresAt: '2025-05-26T08:46:37.000Z',
          url: 'http://localhost:3000/join?code=0ddf674a-5e88-44dc-9a99-fd564ef2161d',
          createdAt: '2025-05-19T08:46:37.000Z',
          isUsed: false
        }
      ];
    }
    
    throw new Error(`未知的URL: ${url}`);
  }
};

// 模拟store
const store = {
  state: {
    familyId: 'f05fdb3d-838b-4b14-8a12-87b55c4c0c2b',
    invitations: [],
    isInvitationsLoading: false,
    error: null
  },
  
  set(newState) {
    Object.assign(this.state, newState);
    console.log('状态更新:', this.state);
  },
  
  get() {
    return this.state;
  }
};

// 模拟fetchInvitations方法
async function fetchInvitations() {
  const { familyId } = store.get();
  if (!familyId) return [];
  
  try {
    store.set({ isInvitationsLoading: true, error: null });
    console.log('开始获取邀请列表...');
    
    const response = await apiClient.get(`/families/${familyId}/invitations`);
    console.log(`获取到 ${response.length} 条邀请记录`);
    
    // 打印每条记录
    response.forEach((invitation, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`ID: ${invitation.id}`);
      console.log(`邀请码: ${invitation.invitationCode}`);
      console.log(`创建时间: ${invitation.createdAt}`);
      console.log(`是否已使用: ${invitation.isUsed ? '是' : '否'}`);
    });
    
    store.set({ invitations: response, isInvitationsLoading: false });
    return response;
  } catch (error) {
    console.error('获取邀请列表失败:', error);
    store.set({
      isInvitationsLoading: false,
      error: error instanceof Error ? error.message : '获取邀请列表失败'
    });
    return [];
  }
}

// 模拟InvitationHistory组件
function InvitationHistory({ invitations, isLoading, onRefresh }) {
  console.log('渲染InvitationHistory组件');
  console.log(`传入的邀请列表长度: ${invitations.length}`);
  console.log('邀请列表数据:', invitations);
  
  if (isLoading) {
    console.log('显示加载状态');
    return;
  }
  
  if (invitations.length === 0) {
    console.log('显示空状态');
    return;
  }
  
  console.log('显示邀请列表');
  invitations.forEach((invitation, index) => {
    console.log(`\n列表项 ${index + 1}:`);
    console.log(`ID: ${invitation.id}`);
    console.log(`邀请码: ${invitation.invitationCode}`);
    console.log(`创建时间: ${invitation.createdAt}`);
    console.log(`是否已使用: ${invitation.isUsed ? '是' : '否'}`);
  });
}

// 执行测试
async function runTest() {
  console.log('开始测试...');
  console.log('初始状态:', store.state);
  
  await fetchInvitations();
  
  console.log('\n测试组件渲染:');
  InvitationHistory({
    invitations: store.state.invitations,
    isLoading: store.state.isInvitationsLoading,
    onRefresh: fetchInvitations
  });
  
  console.log('\n测试完成');
  console.log('最终状态:', store.state);
  console.log(`邀请列表长度: ${store.state.invitations.length}`);
}

runTest();
