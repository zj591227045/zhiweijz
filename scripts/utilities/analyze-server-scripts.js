#!/usr/bin/env node

/**
 * Server目录脚本分析工具
 * 分析server目录下的js脚本，判断哪些可以删除，哪些需要归档
 */

const fs = require('fs');
const path = require('path');

class ServerScriptAnalyzer {
  constructor() {
    this.serverPath = path.join(__dirname, '../../server');
    this.analysis = {
      toDelete: [],      // 可以删除的过时脚本
      toArchive: [],     // 需要归档的有用脚本
      toKeep: [],        // 需要保留在原位置的脚本
      uncertain: []      // 需要人工判断的脚本
    };
  }

  /**
   * 分析所有server目录下的js脚本
   */
  analyzeScripts() {
    console.log('🔍 分析server目录下的脚本文件...');
    
    const jsFiles = this.findJSFiles(this.serverPath);
    
    for (const file of jsFiles) {
      this.analyzeFile(file);
    }
    
    this.printAnalysisResults();
  }

  /**
   * 递归查找所有js文件
   */
  findJSFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过node_modules, dist, coverage等目录
        if (!['node_modules', 'dist', 'coverage', '__tests__'].includes(item)) {
          files.push(...this.findJSFiles(fullPath));
        }
      } else if (item.endsWith('.js') && !item.includes('.test.') && !item.includes('.spec.')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * 分析单个文件
   */
  analyzeFile(filePath) {
    const relativePath = path.relative(this.serverPath, filePath);
    const fileName = path.basename(filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const analysis = this.categorizeScript(fileName, relativePath, content);
      
      this.analysis[analysis.category].push({
        path: relativePath,
        fileName,
        reason: analysis.reason,
        suggestion: analysis.suggestion
      });
    } catch (error) {
      console.error(`读取文件失败: ${relativePath} - ${error.message}`);
    }
  }

  /**
   * 根据文件名、路径和内容分类脚本
   */
  categorizeScript(fileName, relativePath, content) {
    // 调试和分析脚本 - 可以删除
    if (this.isDebugScript(fileName, content)) {
      return {
        category: 'toDelete',
        reason: '调试脚本，用于临时问题排查',
        suggestion: '删除'
      };
    }

    // 测试脚本 - 归档到testing目录
    if (this.isTestScript(fileName, relativePath, content)) {
      return {
        category: 'toArchive',
        reason: '测试脚本，有参考价值',
        suggestion: '移动到scripts/testing/'
      };
    }

    // 数据库操作脚本 - 归档到database目录
    if (this.isDatabaseScript(fileName, content)) {
      return {
        category: 'toArchive',
        reason: '数据库操作脚本，有工具价值',
        suggestion: '移动到scripts/database/'
      };
    }

    // 工具脚本 - 归档到utilities目录
    if (this.isUtilityScript(fileName, content)) {
      return {
        category: 'toArchive',
        reason: '工具脚本，有实用价值',
        suggestion: '移动到scripts/utilities/'
      };
    }

    // 源代码文件 - 保留
    if (relativePath.startsWith('src/')) {
      return {
        category: 'toKeep',
        reason: '源代码文件',
        suggestion: '保留在原位置'
      };
    }

    // 配置文件 - 保留
    if (this.isConfigFile(fileName)) {
      return {
        category: 'toKeep',
        reason: '配置文件',
        suggestion: '保留在原位置'
      };
    }

    // 其他情况需要人工判断
    return {
      category: 'uncertain',
      reason: '无法自动分类',
      suggestion: '需要人工检查'
    };
  }

  /**
   * 判断是否为调试脚本
   */
  isDebugScript(fileName, content) {
    const debugPatterns = [
      /^debug-/,
      /^analyze-/,
      /^check-.*rollover/,
      /^fix-.*rollover/,
      /^verify-.*rollover/,
      /rollover.*difference/,
      /rollover.*amount/,
      /custodial.*budget/,
      /duplicate.*budget/
    ];

    const debugKeywords = [
      'console.log',
      '调试',
      '分析',
      '检查',
      '临时',
      'debug',
      'analyze'
    ];

    // 检查文件名模式
    if (debugPatterns.some(pattern => pattern.test(fileName))) {
      return true;
    }

    // 检查内容中的调试关键词
    const hasDebugKeywords = debugKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );

    // 检查是否包含硬编码的用户ID（通常是调试脚本的特征）
    const hasHardcodedIds = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(content);

    return hasDebugKeywords && hasHardcodedIds;
  }

  /**
   * 判断是否为测试脚本
   */
  isTestScript(fileName, relativePath, content) {
    const testPatterns = [
      /^test-/,
      /test.*\.js$/,
      /-test\.js$/
    ];

    const testPaths = [
      'test/',
      'src/test/',
      '__tests__/'
    ];

    return testPatterns.some(pattern => pattern.test(fileName)) ||
           testPaths.some(testPath => relativePath.startsWith(testPath));
  }

  /**
   * 判断是否为数据库脚本
   */
  isDatabaseScript(fileName, content) {
    const dbKeywords = [
      'PrismaClient',
      'prisma',
      'database',
      'migration',
      'CREATE TABLE',
      'INSERT INTO',
      'UPDATE',
      'DELETE FROM'
    ];

    const dbPatterns = [
      /create.*data/,
      /cleanup.*user/,
      /list.*budget/
    ];

    const hasDbKeywords = dbKeywords.some(keyword => 
      content.includes(keyword)
    );

    const hasDbPatterns = dbPatterns.some(pattern => 
      pattern.test(fileName)
    );

    return hasDbKeywords && (hasDbPatterns || content.includes('prisma.'));
  }

  /**
   * 判断是否为工具脚本
   */
  isUtilityScript(fileName, content) {
    const utilityPatterns = [
      /^create-/,
      /^trigger-/,
      /^simple-/
    ];

    const utilityKeywords = [
      'function',
      'async function',
      'module.exports'
    ];

    return utilityPatterns.some(pattern => pattern.test(fileName)) &&
           utilityKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * 判断是否为配置文件
   */
  isConfigFile(fileName) {
    const configFiles = [
      'jest.config.js',
      'tsconfig.json',
      'package.json'
    ];

    return configFiles.includes(fileName);
  }

  /**
   * 打印分析结果
   */
  printAnalysisResults() {
    console.log('\n📊 Server脚本分析结果');
    console.log('================================');

    console.log('\n🗑️  可以删除的脚本:');
    if (this.analysis.toDelete.length === 0) {
      console.log('  无');
    } else {
      this.analysis.toDelete.forEach(item => {
        console.log(`  ❌ ${item.path}`);
        console.log(`     原因: ${item.reason}`);
        console.log(`     建议: ${item.suggestion}\n`);
      });
    }

    console.log('\n📦 需要归档的脚本:');
    if (this.analysis.toArchive.length === 0) {
      console.log('  无');
    } else {
      this.analysis.toArchive.forEach(item => {
        console.log(`  📁 ${item.path}`);
        console.log(`     原因: ${item.reason}`);
        console.log(`     建议: ${item.suggestion}\n`);
      });
    }

    console.log('\n✅ 需要保留的文件:');
    if (this.analysis.toKeep.length === 0) {
      console.log('  无');
    } else {
      this.analysis.toKeep.forEach(item => {
        console.log(`  ✅ ${item.path} - ${item.reason}`);
      });
    }

    console.log('\n❓ 需要人工判断的文件:');
    if (this.analysis.uncertain.length === 0) {
      console.log('  无');
    } else {
      this.analysis.uncertain.forEach(item => {
        console.log(`  ❓ ${item.path}`);
        console.log(`     原因: ${item.reason}`);
        console.log(`     建议: ${item.suggestion}\n`);
      });
    }

    console.log('\n📈 统计信息:');
    console.log(`  可删除: ${this.analysis.toDelete.length}`);
    console.log(`  需归档: ${this.analysis.toArchive.length}`);
    console.log(`  需保留: ${this.analysis.toKeep.length}`);
    console.log(`  需判断: ${this.analysis.uncertain.length}`);
    console.log(`  总计: ${this.getTotalCount()}`);
  }

  /**
   * 获取总文件数
   */
  getTotalCount() {
    return this.analysis.toDelete.length + 
           this.analysis.toArchive.length + 
           this.analysis.toKeep.length + 
           this.analysis.uncertain.length;
  }

  /**
   * 生成清理脚本
   */
  generateCleanupScript() {
    const scriptPath = path.join(__dirname, 'cleanup-server-scripts.sh');
    let script = '#!/bin/bash\n\n';
    script += '# Server脚本清理脚本\n';
    script += '# 自动生成，请在执行前仔细检查\n\n';

    script += 'echo "🗑️  删除过时脚本..."\n';
    this.analysis.toDelete.forEach(item => {
      script += `rm -f "server/${item.path}"\n`;
    });

    script += '\necho "📦 归档有用脚本..."\n';
    this.analysis.toArchive.forEach(item => {
      const targetDir = item.suggestion.match(/scripts\/(\w+)\//)?.[1] || 'utilities';
      script += `mv "server/${item.path}" "server/scripts/${targetDir}/"\n`;
    });

    script += '\necho "✅ 清理完成！"\n';

    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, 0o755);

    console.log(`\n📝 已生成清理脚本: ${scriptPath}`);
    console.log('请检查脚本内容后执行: ./scripts/utilities/cleanup-server-scripts.sh');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const analyzer = new ServerScriptAnalyzer();
  analyzer.analyzeScripts();
  analyzer.generateCleanupScript();
}

module.exports = ServerScriptAnalyzer;
