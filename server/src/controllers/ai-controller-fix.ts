/**
 * 获取账本LLM设置
 * @param req 请求
 * @param res 响应
 */
public async getAccountLLMSettings(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { accountId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 检查用户是否有权限访问该账本
    const hasAccess = await this.checkAccountAccess(userId, accountId);
    if (!hasAccess) {
      return res.status(403).json({ error: '无权访问该账本' });
    }

    // 首先检查账本是否真的绑定了LLM服务
    try {
      // 查找账本
      const accountBook = await this.prisma.accountBook.findUnique({
        where: { id: accountId }
      });

      // 如果账本不存在
      if (!accountBook) {
        return res.status(404).json({ 
          bound: false,
          error: '账本不存在'
        });
      }

      // 检查账本是否绑定了LLM服务
      if (!accountBook.userLLMSettingId) {
        console.log(`账本 ${accountId} 未绑定LLM服务`);
        return res.status(200).json({
          bound: false,
          message: '账本未绑定LLM服务'
        });
      }

      // 查找关联的UserLLMSetting
      const userLLMSetting = await this.prisma.userLLMSetting.findUnique({
        where: { id: accountBook.userLLMSettingId }
      });

      // 如果找不到关联的UserLLMSetting
      if (!userLLMSetting) {
        console.log(`账本 ${accountId} 绑定的LLM服务 ${accountBook.userLLMSettingId} 不存在`);
        return res.status(200).json({
          bound: false,
          message: '账本绑定的LLM服务不存在'
        });
      }

      // 找到了关联的UserLLMSetting，返回设置信息
      console.log(`账本 ${accountId} 已绑定LLM服务 ${userLLMSetting.id}`);
      
      // 获取账本LLM设置
      const settings = await this.llmProviderService.getLLMSettings(
        userId,
        accountId
      );

      // 移除敏感信息
      const safeSettings = {
        bound: true,
        id: userLLMSetting.id,
        name: userLLMSetting.name,
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKey ? '******' : null,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        baseUrl: settings.baseUrl,
        description: userLLMSetting.description
      };

      return res.json(safeSettings);
    } catch (error) {
      console.error('检查账本LLM服务绑定错误:', error);
      return res.status(500).json({ 
        bound: false,
        error: '处理请求时出错' 
      });
    }
  } catch (error) {
    console.error('获取账本LLM设置错误:', error);
    return res.status(500).json({ 
      bound: false,
      error: '处理请求时出错' 
    });
  }
}
