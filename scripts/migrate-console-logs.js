#!/usr/bin/env node

/**
 * Console.log 迁移脚本
 * 
 * 自动将项目中的 console.log 替换为统一的 logger 调用
 * 
 * 使用方法：
 * node scripts/migrate-console-logs.js [--dry-run] [--file=path/to/file.ts]
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置
const CONFIG = {
  // 要处理的文件模式
  patterns: [
    'apps/web/src/**/*.{ts,tsx,js,jsx}',
  ],
  // 排除的文件
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.d.ts',
    '**/logger.ts',
    '**/logger-examples.ts',
  ],
  // 日志级别映射
  logLevelMapping: {
    'console.log': 'debug',
    'console.info': 'info', 
    'console.warn': 'warn',
    'console.error': 'error',
  }
};

// 解析命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const targetFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];

/**
 * 提取模块名称
 */
function extractModuleName(filePath) {
  const relativePath = path.relative('apps/web/src', filePath);
  const parts = relativePath.split('/');
  
  // 根据文件路径推断模块名
  if (parts.includes('components')) {
    const componentIndex = parts.indexOf('components');
    return parts[componentIndex + 1] || 'Component';
  }
  
  if (parts.includes('store')) {
    return parts[parts.length - 1].replace(/\..*$/, '').replace(/-store$/, '');
  }
  
  if (parts.includes('services')) {
    return parts[parts.length - 1].replace(/\..*$/, '').replace(/\.service$/, '');
  }
  
  if (parts.includes('hooks')) {
    return parts[parts.length - 1].replace(/\..*$/, '').replace(/^use-/, '');
  }
  
  if (parts[0] === 'app') {
    return parts[1] || 'App';
  }
  
  // 默认使用文件名
  return path.basename(filePath, path.extname(filePath));
}

/**
 * 检查文件是否已经导入了 logger
 */
function hasLoggerImport(content) {
  return /import.*logger.*from.*['"].*logger['"]/.test(content) ||
         /import.*createLogger.*from.*['"].*logger['"]/.test(content);
}

/**
 * 添加 logger 导入
 */
function addLoggerImport(content, moduleName) {
  const importStatement = `import { createLogger } from '@/lib/logger';\n`;
  const loggerDeclaration = `\n// 创建模块专用 logger\nconst ${moduleName.toLowerCase()}Log = createLogger('${moduleName}');\n`;
  
  // 找到最后一个 import 语句的位置
  const importRegex = /^import.*from.*['"];?\s*$/gm;
  let lastImportMatch;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }
  
  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    return content.slice(0, insertPos) + 
           '\n' + importStatement + 
           loggerDeclaration + 
           content.slice(insertPos);
  } else {
    // 如果没有找到 import 语句，添加到文件开头
    return importStatement + loggerDeclaration + content;
  }
}

/**
 * 替换 console.log 调用
 */
function replaceConsoleLogs(content, moduleName) {
  const loggerVar = `${moduleName.toLowerCase()}Log`;
  
  // 匹配各种 console.log 模式
  const patterns = [
    // dashboardLog.debug('🏠 [Dashboard] 消息', data)
    {
      regex: /console\.(log|info|warn|error)\s*\(\s*['"`]([^'"`]*\[[^\]]*\][^'"`]*)['"`]\s*,?\s*([^)]*)\)/g,
      replacement: (match, level, message, args) => {
        const logLevel = CONFIG.logLevelMapping[`console.${level}`] || 'debug';
        // 清理消息中的表情符号和模块标识
        const cleanMessage = message.replace(/^[^\w\s]*\s*\[[^\]]*\]\s*/, '').trim();
        const argsStr = args.trim() ? `, ${args}` : '';
        return `${loggerVar}.${logLevel}('${cleanMessage}'${argsStr})`;
      }
    },
    // console.log('普通消息', data)
    {
      regex: /console\.(log|info|warn|error)\s*\(\s*['"`]([^'"`]*)['"`]\s*,?\s*([^)]*)\)/g,
      replacement: (match, level, message, args) => {
        const logLevel = CONFIG.logLevelMapping[`console.${level}`] || 'debug';
        const argsStr = args.trim() ? `, ${args}` : '';
        return `${loggerVar}.${logLevel}('${message}'${argsStr})`;
      }
    },
    // console.log(variable)
    {
      regex: /console\.(log|info|warn|error)\s*\(\s*([^'"`][^)]*)\)/g,
      replacement: (match, level, args) => {
        const logLevel = CONFIG.logLevelMapping[`console.${level}`] || 'debug';
        return `${loggerVar}.${logLevel}('调试信息', ${args})`;
      }
    }
  ];
  
  let result = content;
  
  patterns.forEach(pattern => {
    result = result.replace(pattern.regex, pattern.replacement);
  });
  
  return result;
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否包含 console.log
    if (!/console\.(log|info|warn|error)/.test(content)) {
      return { processed: false, reason: '没有找到 console.log' };
    }
    
    let newContent = content;
    const moduleName = extractModuleName(filePath);
    
    // 如果还没有导入 logger，添加导入
    if (!hasLoggerImport(content)) {
      newContent = addLoggerImport(newContent, moduleName);
    }
    
    // 替换 console.log 调用
    newContent = replaceConsoleLogs(newContent, moduleName);
    
    // 检查是否有变化
    if (newContent === content) {
      return { processed: false, reason: '没有需要替换的内容' };
    }
    
    if (!isDryRun) {
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
    
    return { 
      processed: true, 
      changes: content.split('\n').length - newContent.split('\n').length 
    };
    
  } catch (error) {
    return { processed: false, error: error.message };
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔄 开始迁移 console.log 到统一 logger...\n');
  
  if (isDryRun) {
    console.log('🔍 运行模式：预览（不会修改文件）\n');
  }
  
  let files = [];
  
  if (targetFile) {
    // 处理单个文件
    files = [targetFile];
  } else {
    // 处理所有匹配的文件
    CONFIG.patterns.forEach(pattern => {
      const matchedFiles = glob.sync(pattern, { 
        ignore: CONFIG.exclude,
        absolute: true 
      });
      files.push(...matchedFiles);
    });
  }
  
  // 去重
  files = [...new Set(files)];
  
  console.log(`📁 找到 ${files.length} 个文件需要检查\n`);
  
  let processedCount = 0;
  let errorCount = 0;
  
  files.forEach(filePath => {
    const relativePath = path.relative(process.cwd(), filePath);
    const result = processFile(filePath);
    
    if (result.processed) {
      processedCount++;
      console.log(`✅ ${relativePath} - 已处理`);
    } else if (result.error) {
      errorCount++;
      console.log(`❌ ${relativePath} - 错误: ${result.error}`);
    } else {
      console.log(`⏭️  ${relativePath} - ${result.reason}`);
    }
  });
  
  console.log(`\n📊 处理完成:`);
  console.log(`   - 已处理: ${processedCount} 个文件`);
  console.log(`   - 跳过: ${files.length - processedCount - errorCount} 个文件`);
  console.log(`   - 错误: ${errorCount} 个文件`);
  
  if (isDryRun) {
    console.log('\n💡 这是预览模式，没有实际修改文件。');
    console.log('   要应用更改，请运行: node scripts/migrate-console-logs.js');
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { processFile, extractModuleName };