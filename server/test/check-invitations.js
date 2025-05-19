/**
 * 检查邀请记录
 * 
 * 这个脚本用于检查数据库中的邀请记录
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvitations() {
  try {
    // 获取指定家庭的所有邀请记录
    const familyId = 'f05fdb3d-838b-4b14-8a12-87b55c4c0c2b';
    const invitations = await prisma.invitation.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`找到 ${invitations.length} 条邀请记录：`);
    
    // 打印每条记录的详细信息
    invitations.forEach((invitation, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`ID: ${invitation.id}`);
      console.log(`家庭ID: ${invitation.familyId}`);
      console.log(`邀请码: ${invitation.invitationCode}`);
      console.log(`创建时间: ${invitation.createdAt}`);
      console.log(`过期时间: ${invitation.expiresAt}`);
      console.log(`是否已使用: ${invitation.isUsed ? '是' : '否'}`);
      
      if (invitation.isUsed) {
        console.log(`使用时间: ${invitation.usedAt}`);
        console.log(`使用者ID: ${invitation.usedByUserId || '未记录'}`);
        console.log(`使用者名称: ${invitation.usedByUserName || '未记录'}`);
      }
    });

    // 检查是否有UUID格式的邀请码
    const uuidInvitations = invitations.filter(inv => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(inv.invitationCode)
    );
    
    if (uuidInvitations.length > 0) {
      console.log(`\n发现 ${uuidInvitations.length} 条使用UUID格式的邀请码：`);
      uuidInvitations.forEach(inv => {
        console.log(`- ${inv.invitationCode} (创建于 ${inv.createdAt})`);
      });
    }

    // 检查是否有8位数字格式的邀请码
    const numericInvitations = invitations.filter(inv => 
      /^\d{8}$/.test(inv.invitationCode)
    );
    
    if (numericInvitations.length > 0) {
      console.log(`\n发现 ${numericInvitations.length} 条使用8位数字格式的邀请码：`);
      numericInvitations.forEach(inv => {
        console.log(`- ${inv.invitationCode} (创建于 ${inv.createdAt})`);
      });
    }

    // 检查是否有其他格式的邀请码
    const otherInvitations = invitations.filter(inv => 
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(inv.invitationCode) && 
      !/^\d{8}$/.test(inv.invitationCode)
    );
    
    if (otherInvitations.length > 0) {
      console.log(`\n发现 ${otherInvitations.length} 条使用其他格式的邀请码：`);
      otherInvitations.forEach(inv => {
        console.log(`- ${inv.invitationCode} (创建于 ${inv.createdAt})`);
      });
    }

  } catch (error) {
    console.error('查询邀请记录失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行检查
checkInvitations();
