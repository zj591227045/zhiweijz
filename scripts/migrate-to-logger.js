#!/usr/bin/env node

/**
 * 日志系统迁移脚本
 * 
 * 功能：
 * 1. 自动在文件顶部添加 logger 导入
 * 2. 替换所有 console.log/error/warn/debug 为 logger.*
 * 3. 保持代码格式不变
 */

const fs = require('fs');
const path = require('path');

// 需要处理的目录
const TARGET_DIRS = [
  'server/src/services',
  'server/src/controllers',
  'server/src/routes',
  'server/src/middleware',
  'server/src/middlewares',
  'server/src/utils',
  'server/src/tasks',
  'server/src/ai',
  'server/src/admin',
];

// 统计信息
const stats = {
  totalFiles: 0,
  modifiedFiles: 0,
  totalReplacements: 0,
  byLevel: {
    log: 0,
    error: 0,
    warn: 0,
    debug: 0,
  }
};

/**
 * 检查文件是否已经导入了 logger
 */
function hasLoggerImport(content) {
  return /import.*logger.*from.*['"].*logger['"]/.test(content);
}

/**
 * 计算相对路径
 */
function calculateRelativePath(filePath) {
  // 计算文件相对于 server/src 的深度
  const relativePath = filePath.replace(/^.*\/server\/src\//, '');
  const depth = (relativePath.match(/\//g) || []).length;
  
  // 根据深度生成相对路径
  const prefix = depth === 0 ? './' : '../'.repeat(depth);
  return `${prefix}utils/logger`;
}

/**
 * 在文件顶部添加 logger 导入
 */
function addLoggerImport(content, filePath) {
  const loggerPath = calculateRelativePath(filePath);
  
  // 找到第一个 import 语句的位置
  const importMatch = content.match(/^import\s/m);
  
  if (importMatch) {
    // 在第一个 import 之前插入
    const insertPos = importMatch.index;
    return content.slice(0, insertPos) + 
           `import { logger } from '${loggerPath}';\n` +
           content.slice(insertPos);
  } else {
    // 如果没有 import，在文件开头插入（跳过注释）
    const codeStart = content.search(/^[^/\s]/m);
    if (codeStart > 0) {
      return content.slice(0, codeStart) +
             `import { logger } from '${loggerPath}';\n\n` +
             content.slice(codeStart);
    } else {
      return `import { logger } from '${loggerPath}';\n\n` + content;
    }
  }
}

/**
 * 替换 console.* 为 logger.*
 */
function replaceConsoleCalls(content) {
  let modified = content;
  let replacements = 0;

  // 替换 console.log -> logger.info (大部分 log 应该是 info 级别)
  const logMatches = modified.match(/console\.log\(/g);
  if (logMatches) {
    stats.byLevel.log += logMatches.length;
    replacements += logMatches.length;
  }
  modified = modified.replace(/console\.log\(/g, 'logger.info(');

  // 替换 console.error -> logger.error
  const errorMatches = modified.match(/console\.error\(/g);
  if (errorMatches) {
    stats.byLevel.error += errorMatches.length;
    replacements += errorMatches.length;
  }
  modified = modified.replace(/console\.error\(/g, 'logger.error(');

  // 替换 console.warn -> logger.warn
  const warnMatches = modified.match(/console\.warn\(/g);
  if (warnMatches) {
    stats.byLevel.warn += warnMatches.length;
    replacements += warnMatches.length;
  }
  modified = modified.replace(/console\.warn\(/g, 'logger.warn(');

  // 替换 console.debug -> logger.debug
  const debugMatches = modified.match(/console\.debug\(/g);
  if (debugMatches) {
    stats.byLevel.debug += debugMatches.length;
    replacements += debugMatches.length;
  }
  modified = modified.replace(/console\.debug\(/g, 'logger.debug(');

  return { modified, replacements };
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否有 console.* 调用
    if (!/console\.(log|error|warn|debug)\(/.test(content)) {
      return false; // 没有需要替换的
    }

    let modified = content;
    
    // 添加 logger 导入（如果还没有）
    if (!hasLoggerImport(modified)) {
      modified = addLoggerImport(modified, filePath);
    }

    // 替换 console.* 调用
    const result = replaceConsoleCalls(modified);
    modified = result.modified;

    if (result.replacements > 0) {
      fs.writeFileSync(filePath, modified, 'utf8');
      stats.modifiedFiles++;
      stats.totalReplacements += result.replacements;
      console.log(`✅ ${filePath}: ${result.replacements} 处替换`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 递归处理目录
 */
function processDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        stats.totalFiles++;
        processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ 处理目录失败: ${dirPath}`, error.message);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始日志系统迁移...\n');

  for (const dir of TARGET_DIRS) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      console.log(`📁 处理目录: ${dir}`);
      processDirectory(fullPath);
    } else {
      console.log(`⚠️  目录不存在: ${dir}`);
    }
  }

  console.log('\n📊 迁移统计:');
  console.log(`  总文件数: ${stats.totalFiles}`);
  console.log(`  修改文件数: ${stats.modifiedFiles}`);
  console.log(`  总替换数: ${stats.totalReplacements}`);
  console.log(`  - console.log → logger.info: ${stats.byLevel.log}`);
  console.log(`  - console.error → logger.error: ${stats.byLevel.error}`);
  console.log(`  - console.warn → logger.warn: ${stats.byLevel.warn}`);
  console.log(`  - console.debug → logger.debug: ${stats.byLevel.debug}`);
  console.log('\n✅ 迁移完成！');
}

main();
