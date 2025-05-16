const { PrismaClient } = require('@prisma/client');

// 设置数据库连接字符串
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

// 初始化Prisma客户端
const prisma = new PrismaClient();

/**
 * 为用户创建默认账本
 * @param {string} userEmail - 用户邮箱
 */
async function createDefaultAccountBook(userEmail) {
  try {
    console.log(`开始为用户 ${userEmail} 创建默认账本...`);

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      console.error(`未找到邮箱为 ${userEmail} 的用户`);
      return;
    }

    console.log(`找到用户: ${user.name} (ID: ${user.id})`);

    // 检查用户是否已有默认账本
    const existingDefaultBook = await prisma.AccountBook.findFirst({
      where: {
        userId: user.id,
        isDefault: true,
      },
    });

    if (existingDefaultBook) {
      console.log(`用户已有默认账本: ${existingDefaultBook.name} (ID: ${existingDefaultBook.id})`);
      return;
    }

    // 创建默认账本
    const defaultAccountBook = await prisma.AccountBook.create({
      data: {
        name: '默认账本',
        description: '系统自动创建的默认账本',
        isDefault: true,
        userId: user.id,
      },
    });

    console.log(`成功创建默认账本: ${defaultAccountBook.name} (ID: ${defaultAccountBook.id})`);

    // 为默认账本创建LLM设置
    const llmSetting = await prisma.AccountLLMSetting.create({
      data: {
        accountBookId: defaultAccountBook.id,
        provider: 'OPENAI',
        model: 'gpt-3.5-turbo',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 1000,
      },
    });

    console.log(`成功为默认账本创建LLM设置 (ID: ${llmSetting.id})`);

  } catch (error) {
    console.error('创建默认账本时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 获取命令行参数中的用户邮箱
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('请提供用户邮箱作为参数');
  process.exit(1);
}

// 执行创建默认账本的函数
createDefaultAccountBook(userEmail);
