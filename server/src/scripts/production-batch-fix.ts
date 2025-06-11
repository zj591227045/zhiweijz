/**
 * 生产环境分批修复脚本
 * 安全地分批修复家庭交易记录的family_id和family_member_id字段
 * 
 * 使用方法：
 * npx ts-node src/scripts/production-batch-fix.ts --batch-size=500 --dry-run
 * npx ts-node src/scripts/production-batch-fix.ts --batch-size=500 --execute
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FixOptions {
  batchSize: number;
  dryRun: boolean;
  maxBatches?: number;
}

interface FixResult {
  transactionId: string;
  oldFamilyId: string | null;
  oldFamilyMemberId: string | null;
  newFamilyId: string;
  newFamilyMemberId: string;
  method: 'budget' | 'user' | 'skip';
}

async function batchFixTransactions(options: FixOptions) {
  console.log('🔧 开始生产环境分批修复...');
  console.log(`📊 配置: 批次大小=${options.batchSize}, 试运行=${options.dryRun}`);

  const fixLog: FixResult[] = [];
  let totalFixed = 0;
  let totalSkipped = 0;
  let batchCount = 0;

  try {
    while (true) {
      batchCount++;
      
      if (options.maxBatches && batchCount > options.maxBatches) {
        console.log(`⏹️  达到最大批次限制 (${options.maxBatches})，停止处理`);
        break;
      }

      console.log(`\n📦 处理第 ${batchCount} 批...`);

      // 获取一批需要修复的记录
      const transactionsToFix = await prisma.transaction.findMany({
        where: {
          accountBook: {
            type: 'FAMILY'
          },
          OR: [
            { familyId: null },
            { familyMemberId: null }
          ]
        },
        include: {
          accountBook: {
            include: {
              family: {
                include: {
                  members: true
                }
              }
            }
          },
          budget: {
            include: {
              user: true,
              familyMember: true
            }
          },
          user: true
        },
        take: options.batchSize,
        orderBy: {
          createdAt: 'asc' // 按创建时间排序，确保处理顺序一致
        }
      });

      if (transactionsToFix.length === 0) {
        console.log('✅ 没有更多需要修复的记录');
        break;
      }

      console.log(`📝 本批次需要处理 ${transactionsToFix.length} 条记录`);

      let batchFixed = 0;
      let batchSkipped = 0;

      // 开始事务
      if (!options.dryRun) {
        await prisma.$transaction(async (tx) => {
          for (const transaction of transactionsToFix) {
            const result = await processTransaction(transaction, tx, options.dryRun);
            
            if (result) {
              fixLog.push(result);
              if (result.method !== 'skip') {
                batchFixed++;
              } else {
                batchSkipped++;
              }
            }
          }
        });
      } else {
        // 试运行模式
        for (const transaction of transactionsToFix) {
          const result = await processTransaction(transaction, prisma, options.dryRun);
          
          if (result) {
            fixLog.push(result);
            if (result.method !== 'skip') {
              batchFixed++;
            } else {
              batchSkipped++;
            }
          }
        }
      }

      totalFixed += batchFixed;
      totalSkipped += batchSkipped;

      console.log(`✅ 第 ${batchCount} 批完成: 修复 ${batchFixed} 条, 跳过 ${batchSkipped} 条`);

      // 批次间暂停，避免对数据库造成过大压力
      if (!options.dryRun && transactionsToFix.length === options.batchSize) {
        console.log('⏸️  暂停 2 秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 生成修复报告
    await generateFixReport(fixLog, totalFixed, totalSkipped, options.dryRun);

    // 验证修复结果
    if (!options.dryRun) {
      await validateFixResults();
    }

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
    
    if (!options.dryRun) {
      console.log('🔄 建议检查数据一致性并考虑回滚');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function processTransaction(
  transaction: any, 
  db: any, 
  dryRun: boolean
): Promise<FixResult | null> {
  
  if (!transaction.accountBook?.family) {
    return {
      transactionId: transaction.id,
      oldFamilyId: transaction.familyId,
      oldFamilyMemberId: transaction.familyMemberId,
      newFamilyId: '',
      newFamilyMemberId: '',
      method: 'skip'
    };
  }

  const family = transaction.accountBook.family;
  const familyMembers = family.members;

  let finalFamilyId = transaction.familyId || family.id;
  let finalFamilyMemberId = transaction.familyMemberId;
  let method: 'budget' | 'user' | 'skip' = 'skip';

  // 如果没有familyMemberId，尝试确定
  if (!finalFamilyMemberId) {
    if (transaction.budgetId && transaction.budget) {
      if (transaction.budget.familyMemberId) {
        // 预算直接关联到家庭成员
        finalFamilyMemberId = transaction.budget.familyMemberId;
        method = 'budget';
      } else if (transaction.budget.userId) {
        // 预算关联到用户，查找该用户在家庭中的成员记录
        const familyMember = familyMembers.find((m: any) => m.userId === transaction.budget.userId);
        if (familyMember) {
          finalFamilyMemberId = familyMember.id;
          method = 'budget';
        }
      }
    }

    // 如果通过预算无法确定，使用交易创建者
    if (!finalFamilyMemberId && transaction.userId) {
      const familyMember = familyMembers.find((m: any) => m.userId === transaction.userId);
      if (familyMember) {
        finalFamilyMemberId = familyMember.id;
        method = 'user';
      }
    }
  }

  if (!finalFamilyMemberId) {
    return {
      transactionId: transaction.id,
      oldFamilyId: transaction.familyId,
      oldFamilyMemberId: transaction.familyMemberId,
      newFamilyId: finalFamilyId,
      newFamilyMemberId: '',
      method: 'skip'
    };
  }

  // 执行更新
  if (!dryRun) {
    await db.transaction.update({
      where: { id: transaction.id },
      data: {
        familyId: finalFamilyId,
        familyMemberId: finalFamilyMemberId
      }
    });
  }

  return {
    transactionId: transaction.id,
    oldFamilyId: transaction.familyId,
    oldFamilyMemberId: transaction.familyMemberId,
    newFamilyId: finalFamilyId,
    newFamilyMemberId: finalFamilyMemberId,
    method
  };
}

async function generateFixReport(
  fixLog: FixResult[], 
  totalFixed: number, 
  totalSkipped: number, 
  dryRun: boolean
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `fix-report-${timestamp}.json`;

  console.log(`\n📊 修复报告:`);
  console.log(`  总处理记录: ${fixLog.length}`);
  console.log(`  成功修复: ${totalFixed}`);
  console.log(`  跳过记录: ${totalSkipped}`);
  console.log(`  通过预算修复: ${fixLog.filter(r => r.method === 'budget').length}`);
  console.log(`  通过用户修复: ${fixLog.filter(r => r.method === 'user').length}`);

  if (dryRun) {
    console.log(`\n🔍 这是试运行结果，实际数据未被修改`);
  } else {
    console.log(`\n💾 详细报告已保存到: ${reportFile}`);
    
    // 保存详细报告到文件
    const fs = require('fs');
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed: fixLog.length,
        totalFixed,
        totalSkipped,
        byMethod: {
          budget: fixLog.filter(r => r.method === 'budget').length,
          user: fixLog.filter(r => r.method === 'user').length,
          skip: fixLog.filter(r => r.method === 'skip').length
        }
      },
      details: fixLog
    }, null, 2));
  }
}

async function validateFixResults() {
  console.log(`\n🔍 验证修复结果...`);

  const remainingIssues = await prisma.transaction.count({
    where: {
      accountBook: {
        type: 'FAMILY'
      },
      OR: [
        { familyId: null },
        { familyMemberId: null }
      ]
    }
  });

  if (remainingIssues === 0) {
    console.log('✅ 验证通过: 所有家庭交易记录已修复完成');
  } else {
    console.log(`⚠️  验证发现: 还有 ${remainingIssues} 条记录需要处理`);
  }
}

// 解析命令行参数
function parseArgs(): FixOptions {
  const args = process.argv.slice(2);
  const options: FixOptions = {
    batchSize: 500,
    dryRun: true
  };

  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--execute') {
      options.dryRun = false;
    } else if (arg.startsWith('--max-batches=')) {
      options.maxBatches = parseInt(arg.split('=')[1]);
    }
  }

  return options;
}

// 执行修复
const options = parseArgs();

console.log('⚠️  生产环境数据修复脚本');
console.log('请确保已经备份数据库！');

if (!options.dryRun) {
  console.log('🔴 这将修改生产数据！');
  console.log('如果不确定，请先使用 --dry-run 参数进行试运行');
}

batchFixTransactions(options)
  .then(() => {
    console.log('\n🏁 修复脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 修复脚本执行失败:', error);
    process.exit(1);
  }); 