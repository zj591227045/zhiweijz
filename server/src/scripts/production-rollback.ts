/**
 * 生产环境回滚脚本
 * 根据修复报告回滚已修改的数据
 *
 * 使用方法：
 * npx ts-node src/scripts/production-rollback.ts --report-file=fix-report-2024-01-01T10-00-00-000Z.json --dry-run
 * npx ts-node src/scripts/production-rollback.ts --report-file=fix-report-2024-01-01T10-00-00-000Z.json --execute
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface RollbackOptions {
  reportFile: string;
  dryRun: boolean;
}

interface FixResult {
  transactionId: string;
  oldFamilyId: string | null;
  oldFamilyMemberId: string | null;
  newFamilyId: string;
  newFamilyMemberId: string;
  method: 'budget' | 'user' | 'skip';
}

interface FixReport {
  timestamp: string;
  summary: {
    totalProcessed: number;
    totalFixed: number;
    totalSkipped: number;
    byMethod: {
      budget: number;
      user: number;
      skip: number;
    };
  };
  details: FixResult[];
}

async function rollbackChanges(options: RollbackOptions) {
  console.log('🔄 开始回滚操作...');
  console.log(`📄 报告文件: ${options.reportFile}`);
  console.log(`🔍 试运行: ${options.dryRun}`);

  try {
    // 读取修复报告
    if (!fs.existsSync(options.reportFile)) {
      throw new Error(`报告文件不存在: ${options.reportFile}`);
    }

    const reportContent = fs.readFileSync(options.reportFile, 'utf-8');
    const report: FixReport = JSON.parse(reportContent);

    console.log(`\n📊 报告信息:`);
    console.log(`  修复时间: ${report.timestamp}`);
    console.log(`  总处理记录: ${report.summary.totalProcessed}`);
    console.log(`  成功修复: ${report.summary.totalFixed}`);
    console.log(`  跳过记录: ${report.summary.totalSkipped}`);

    // 过滤出需要回滚的记录（跳过 method === 'skip' 的记录）
    const recordsToRollback = report.details.filter((r) => r.method !== 'skip');

    console.log(`\n🔄 需要回滚的记录: ${recordsToRollback.length} 条`);

    if (recordsToRollback.length === 0) {
      console.log('✅ 没有需要回滚的记录');
      return;
    }

    let rolledBack = 0;
    let failed = 0;

    // 分批回滚
    const batchSize = 100;
    for (let i = 0; i < recordsToRollback.length; i += batchSize) {
      const batch = recordsToRollback.slice(i, i + batchSize);
      console.log(
        `\n📦 处理回滚批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          recordsToRollback.length / batchSize,
        )}`,
      );

      if (!options.dryRun) {
        await prisma.$transaction(async (tx) => {
          for (const record of batch) {
            try {
              // 验证当前数据是否与报告中的新值匹配
              const currentTransaction = await tx.transaction.findUnique({
                where: { id: record.transactionId },
                select: { familyId: true, familyMemberId: true },
              });

              if (!currentTransaction) {
                console.log(`⚠️  交易记录不存在: ${record.transactionId}`);
                failed++;
                continue;
              }

              // 检查数据是否已被其他操作修改
              if (
                currentTransaction.familyId !== record.newFamilyId ||
                currentTransaction.familyMemberId !== record.newFamilyMemberId
              ) {
                console.log(`⚠️  数据已被修改，跳过回滚: ${record.transactionId}`);
                failed++;
                continue;
              }

              // 执行回滚
              await tx.transaction.update({
                where: { id: record.transactionId },
                data: {
                  familyId: record.oldFamilyId,
                  familyMemberId: record.oldFamilyMemberId,
                },
              });

              rolledBack++;
            } catch (error) {
              console.error(`❌ 回滚失败: ${record.transactionId}`, error);
              failed++;
            }
          }
        });
      } else {
        // 试运行模式
        for (const record of batch) {
          const currentTransaction = await prisma.transaction.findUnique({
            where: { id: record.transactionId },
            select: { familyId: true, familyMemberId: true },
          });

          if (!currentTransaction) {
            console.log(`⚠️  交易记录不存在: ${record.transactionId}`);
            failed++;
            continue;
          }

          if (
            currentTransaction.familyId !== record.newFamilyId ||
            currentTransaction.familyMemberId !== record.newFamilyMemberId
          ) {
            console.log(`⚠️  数据已被修改，跳过回滚: ${record.transactionId}`);
            failed++;
            continue;
          }

          console.log(`✅ 可以回滚: ${record.transactionId}`);
          rolledBack++;
        }
      }

      console.log(
        `✅ 批次完成: 回滚 ${Math.min(
          batch.length,
          rolledBack - (i === 0 ? 0 : Math.floor(i / batchSize) * batchSize),
        )} 条`,
      );
    }

    console.log(`\n📊 回滚结果:`);
    console.log(`  成功回滚: ${rolledBack} 条`);
    console.log(`  失败记录: ${failed} 条`);

    if (options.dryRun) {
      console.log(`\n🔍 这是试运行结果，实际数据未被修改`);
    } else {
      console.log(`\n✅ 回滚操作完成`);

      // 验证回滚结果
      await validateRollback(recordsToRollback);
    }
  } catch (error) {
    console.error('❌ 回滚过程中发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function validateRollback(recordsToRollback: FixResult[]) {
  console.log(`\n🔍 验证回滚结果...`);

  let validationPassed = 0;
  let validationFailed = 0;

  for (const record of recordsToRollback) {
    const currentTransaction = await prisma.transaction.findUnique({
      where: { id: record.transactionId },
      select: { familyId: true, familyMemberId: true },
    });

    if (!currentTransaction) {
      validationFailed++;
      continue;
    }

    if (
      currentTransaction.familyId === record.oldFamilyId &&
      currentTransaction.familyMemberId === record.oldFamilyMemberId
    ) {
      validationPassed++;
    } else {
      validationFailed++;
    }
  }

  console.log(`  验证通过: ${validationPassed} 条`);
  console.log(`  验证失败: ${validationFailed} 条`);

  if (validationFailed === 0) {
    console.log('✅ 回滚验证通过');
  } else {
    console.log('⚠️  部分记录回滚验证失败');
  }
}

// 解析命令行参数
function parseArgs(): RollbackOptions {
  const args = process.argv.slice(2);
  const options: RollbackOptions = {
    reportFile: '',
    dryRun: true,
  };

  for (const arg of args) {
    if (arg.startsWith('--report-file=')) {
      options.reportFile = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--execute') {
      options.dryRun = false;
    }
  }

  if (!options.reportFile) {
    console.error('❌ 请指定报告文件: --report-file=filename.json');
    process.exit(1);
  }

  return options;
}

// 执行回滚
const options = parseArgs();

console.log('⚠️  生产环境回滚脚本');
console.log('请确保已经备份数据库！');

if (!options.dryRun) {
  console.log('🔴 这将修改生产数据！');
  console.log('如果不确定，请先使用 --dry-run 参数进行试运行');
}

rollbackChanges(options)
  .then(() => {
    console.log('\n🏁 回滚脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 回滚脚本执行失败:', error);
    process.exit(1);
  });
