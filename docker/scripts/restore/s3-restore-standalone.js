#!/usr/bin/env node
/**
 * S3对象存储恢复工具 - 独立运行版本
 * 
 * 功能：
 * 1. 从 restore-config.json 读取配置
 * 2. 连接 WebDAV 读取备份快照
 * 3. 直接恢复文件到 S3 对象存储
 * 
 * 使用方法：
 * ./restore.sh [--config restore-config.json]
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from 'webdav';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class S3RestoreTool {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'zhiweijz-s3-restore');
    this.config = null;
    this.s3Client = null;
    this.webdavClient = null;
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * 主流程
   */
  async run() {
    try {
      console.log('='.repeat(60));
      console.log('S3对象存储恢复工具');
      console.log('='.repeat(60));
      console.log('');

      // 步骤1: 加载配置
      console.log('[步骤 1/6] 加载配置...');
      await this.loadConfig();
      console.log('✅ 配置加载成功\n');

      // 步骤2: 初始化S3客户端
      console.log('[步骤 2/6] 初始化S3客户端...');
      this.initializeS3();
      console.log('✅ S3客户端初始化成功\n');

      // 步骤3: 验证S3写入权限
      console.log('[步骤 3/6] 验证S3写入权限...');
      await this.verifyS3Access();
      console.log('✅ S3权限验证通过\n');

      // 步骤4: 初始化WebDAV客户端
      console.log('[步骤 4/6] 连接WebDAV备份服务器...');
      this.initializeWebDAV();
      console.log('✅ WebDAV连接成功\n');

      // 步骤5: 列出可用的备份快照
      console.log('[步骤 5/6] 获取可用备份快照...');
      const snapshots = await this.listSnapshots();
      
      if (snapshots.length === 0) {
        console.log('❌ 没有找到可用的备份快照');
        return;
      }

      console.log(`✅ 找到 ${snapshots.length} 个备份快照\n`);

      // 选择要恢复的快照
      const selectedSnapshot = await this.selectSnapshot(snapshots);
      console.log('');

      // 步骤6: 执行恢复
      console.log('[步骤 6/6] 执行恢复操作...');
      console.log('⚠️  警告：此操作将覆盖现有S3存储中的文件！');
      
      const confirmed = await this.confirm('确认要继续吗？');
      if (!confirmed) {
        console.log('❌ 恢复操作已取消');
        return;
      }

      await this.restoreSnapshot(selectedSnapshot);
      console.log('\n✅ 恢复完成！');

    } catch (error) {
      console.error('\n❌ 恢复失败:', error.message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  /**
   * 加载配置文件
   */
  async loadConfig() {
    const args = process.argv.slice(2);
    
    // 从命令行参数获取配置文件路径
    const configIndex = args.indexOf('--config');
    let configPath;
    
    if (configIndex !== -1 && args[configIndex + 1]) {
      configPath = path.resolve(args[configIndex + 1]);
    } else {
      // 默认使用 restore-config.json
      configPath = path.join(__dirname, 'restore-config.json');
      
      // 如果不存在，尝试使用示例配置
      if (!fs.existsSync(configPath)) {
        const examplePath = path.join(__dirname, 'restore-config.example.json');
        if (fs.existsSync(examplePath)) {
          console.log('  未找到 restore-config.json，使用示例配置');
          configPath = examplePath;
        } else {
          throw new Error('未找到配置文件，请创建 restore-config.json 或使用 --config 参数指定');
        }
      }
    }

    console.log(`  配置文件: ${configPath}`);
    
    const configContent = fs.readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(configContent);

    // 验证配置
    if (!this.config.webdav || !this.config.s3) {
      throw new Error('配置文件格式错误：缺少 webdav 或 s3 配置');
    }

    console.log(`  WebDAV: ${this.config.webdav.url}`);
    console.log(`  S3 Endpoint: ${this.config.s3.endpoint}`);
  }

  /**
   * 初始化S3客户端
   */
  initializeS3() {
    const { endpoint, accessKeyId, secretAccessKey, region } = this.config.s3;

    this.s3Client = new S3Client({
      endpoint,
      region: region || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // MinIO 需要
    });

    console.log(`  Endpoint: ${endpoint}`);
    console.log(`  Region: ${region || 'us-east-1'}`);
    console.log(`  Access Key: ${accessKeyId}`);
  }

  /**
   * 验证S3访问权限
   */
  async verifyS3Access() {
    try {
      const testKey = `restore-test-${Date.now()}.txt`;
      const testContent = Buffer.from('restore test');
      
      // 测试写入
      await this.s3Client.send(new PutObjectCommand({
        Bucket: 'temp-files',
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
      }));
      console.log('  ✓ 写入权限验证通过');
      
      // 测试删除
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: 'temp-files',
        Key: testKey,
      }));
      console.log('  ✓ 删除权限验证通过');
      
    } catch (error) {
      throw new Error(`S3权限验证失败: ${error.message}`);
    }
  }

  /**
   * 初始化WebDAV客户端
   */
  initializeWebDAV() {
    const { url, username, password, basePath } = this.config.webdav;

    this.webdavClient = createClient(url, {
      username,
      password,
    });

    this.webdavBasePath = basePath || '/';
    
    console.log(`  URL: ${url}`);
    console.log(`  用户: ${username}`);
    console.log(`  基础路径: ${this.webdavBasePath}`);
  }

  /**
   * 列出所有可用的备份快照
   */
  async listSnapshots() {
    try {
      const snapshotsPath = path.posix.join(this.webdavBasePath, 'snapshots');
      const items = await this.webdavClient.getDirectoryContents(snapshotsPath);

      const snapshotFiles = items.filter(item =>
        item.type === 'file' &&
        (item.basename.startsWith('full_') || item.basename.startsWith('incr_')) &&
        item.basename.endsWith('.json')
      );

      const snapshots = [];

      for (const file of snapshotFiles) {
        try {
          // 下载快照文件
          const remotePath = path.posix.join(snapshotsPath, file.basename);
          const content = await this.webdavClient.getFileContents(remotePath, { format: 'text' });
          const snapshot = JSON.parse(content);

          const files = snapshot.files || {};
          const fileCount = Object.keys(files).length;
          const totalSize = Object.values(files).reduce((sum, f) => sum + (f.size || 0), 0);

          snapshots.push({
            filename: file.basename,
            backupType: snapshot.backupType,
            backupTime: snapshot.backupTime,
            fileCount,
            totalSize,
            lastmod: new Date(file.lastmod),
          });
        } catch (error) {
          console.warn(`  ⚠ 跳过无效快照: ${file.basename}`);
        }
      }

      // 按时间倒序排序
      snapshots.sort((a, b) => b.lastmod.getTime() - a.lastmod.getTime());

      return snapshots;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * 选择要恢复的快照
   */
  async selectSnapshot(snapshots) {
    console.log('\n可用的备份快照：\n');
    console.log('序号  类型    备份时间                  文件数    大小');
    console.log('-'.repeat(70));

    snapshots.forEach((snapshot, index) => {
      const type = snapshot.backupType === 'full' ? '全量' : '增量';
      const time = new Date(snapshot.backupTime).toLocaleString('zh-CN');
      const size = this.formatFileSize(snapshot.totalSize);
      
      console.log(
        `${String(index + 1).padStart(4)}  ${type.padEnd(6)}  ${time.padEnd(24)}  ${String(snapshot.fileCount).padStart(6)}    ${size}`
      );
    });

    console.log('');

    const answer = await this.question('请输入要恢复的快照序号 (1-' + snapshots.length + '): ');
    const index = parseInt(answer) - 1;

    if (isNaN(index) || index < 0 || index >= snapshots.length) {
      throw new Error('无效的序号');
    }

    const selected = snapshots[index];
    console.log(`\n已选择: ${selected.filename}`);
    console.log(`  类型: ${selected.backupType === 'full' ? '全量备份' : '增量备份'}`);
    console.log(`  时间: ${new Date(selected.backupTime).toLocaleString('zh-CN')}`);
    console.log(`  文件: ${selected.fileCount} 个`);
    console.log(`  大小: ${this.formatFileSize(selected.totalSize)}`);

    return selected;
  }

  /**
   * 执行快照恢复
   */
  async restoreSnapshot(snapshot) {
    const startTime = Date.now();

    // 下载快照文件
    const snapshotsPath = path.posix.join(this.webdavBasePath, 'snapshots');
    const remotePath = path.posix.join(snapshotsPath, snapshot.filename);
    const content = await this.webdavClient.getFileContents(remotePath, { format: 'text' });
    const snapshotData = JSON.parse(content);
    
    const files = snapshotData.files || {};

    const progress = {
      totalFiles: Object.keys(files).length,
      restoredFiles: 0,
      failedFiles: 0,
      totalSize: 0,
      restoredSize: 0,
    };

    console.log(`\n开始恢复 ${progress.totalFiles} 个文件...\n`);

    // 恢复每个文件
    for (const [fileKey, fileInfo] of Object.entries(files)) {
      try {
        // 解析bucket和key
        const [bucket, ...keyParts] = fileKey.split('/');
        const key = keyParts.join('/');

        // 从对象池下载文件
        const objectPath = path.posix.join(this.webdavBasePath, 'objects', fileInfo.hash);
        const fileBuffer = await this.webdavClient.getFileContents(objectPath, { format: 'binary' });

        // 上传到S3
        await this.s3Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Buffer.from(fileBuffer),
        }));

        progress.restoredFiles++;
        progress.restoredSize += fileInfo.size || 0;
        progress.totalSize += fileInfo.size || 0;

        // 显示进度
        const percent = ((progress.restoredFiles / progress.totalFiles) * 100).toFixed(1);
        process.stdout.write(`\r进度: ${percent}% (${progress.restoredFiles}/${progress.totalFiles}) - ${fileKey.substring(0, 50)}`);

      } catch (error) {
        progress.failedFiles++;
        progress.totalSize += fileInfo.size || 0;
        console.error(`\n  ✗ 恢复失败: ${fileKey} - ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;

    console.log('\n');
    console.log('='.repeat(60));
    console.log('恢复统计:');
    console.log(`  总文件数: ${progress.totalFiles}`);
    console.log(`  成功恢复: ${progress.restoredFiles}`);
    console.log(`  失败: ${progress.failedFiles}`);
    console.log(`  总大小: ${this.formatFileSize(progress.totalSize)}`);
    console.log(`  耗时: ${(duration / 1000).toFixed(2)}秒`);
    console.log('='.repeat(60));
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  /**
   * 询问用户输入
   */
  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * 确认操作
   */
  async confirm(message) {
    const answer = await this.question(`${message} (yes/no): `);
    return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
  }
}

// 主程序
async function main() {
  const tool = new S3RestoreTool();
  await tool.run();
}

main().catch((error) => {
  console.error('程序异常退出:', error);
  process.exit(1);
});
