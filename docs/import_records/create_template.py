#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建记账记录导入模板文件
"""

import csv
import os
from datetime import datetime

def create_csv_template():
    """创建CSV模板文件"""
    
    # CSV模板数据
    csv_data = [
        # 表头
        ['日期', '金额', '类型', '分类', '描述', '家庭成员'],
        # 空行用于用户填写
        ['', '', '', '', '', ''],
        # 分隔线
        ['### 示例数据 ###', '', '', '', '', ''],
        # 示例数据
        ['2024-01-15', '-25.50', '支出', '餐饮', '午餐', ''],
        ['2024-01-14', '-50.00', '支出', '交通', '地铁卡充值', ''],
        ['2024-01-14', '5000.00', '收入', '工资', '月薪', ''],
        ['2024-01-13', '-156.80', '支出', '购物', '超市购物', '张三'],
        ['2024-01-12', '-58.00', '支出', '娱乐', '电影票', ''],
        ['2024-01-11', '200.00', '收入', '兼职', '兼职收入', ''],
        ['2024-01-10', '-35.00', '支出', '通讯', '手机话费', ''],
        ['2024-01-09', '-120.00', '支出', '服饰', '冬装', '李四'],
        ['', '', '', '', '', ''],
        # 字段说明
        ['### 字段说明 ###', '', '', '', '', ''],
        ['日期：记账发生日期，格式YYYY-MM-DD', '', '', '', '', ''],
        ['金额：正数表示收入，负数表示支出', '', '', '', '', ''],
        ['类型：收入 或 支出（或INCOME/EXPENSE）', '', '', '', '', ''],
        ['分类：见下方标准分类列表', '', '', '', '', ''],
        ['描述：可选，记账详细说明（最多200字符）', '', '', '', '', ''],
        ['家庭成员：可选，仅家庭账本需要填写', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        # 标准分类
        ['### 标准支出分类 ###', '', '', '', '', ''],
        ['餐饮', '购物', '日用', '交通', '运动', '娱乐'],
        ['通讯', '服饰', '美容', '居家', '孩子', '长辈'],
        ['社交', '旅行', '数码', '汽车', '医疗', '还款'],
        ['保险', '学习', '办公', '维修', '利息', ''],
        ['', '', '', '', '', ''],
        ['### 标准收入分类 ###', '', '', '', '', ''],
        ['工资', '兼职', '理财', '奖金', '提成', '其他']
    ]
    
    # 写入CSV文件
    with open('记账记录导入模板.csv', 'w', newline='', encoding='utf-8-sig') as file:
        writer = csv.writer(file)
        writer.writerows(csv_data)
    
    print("✅ CSV模板文件已创建: 记账记录导入模板.csv")

def create_excel_template():
    """创建Excel模板文件（需要安装xlsxwriter: pip install xlsxwriter）"""
    try:
        import xlsxwriter
        
        # 创建Excel工作簿
        workbook = xlsxwriter.Workbook('记账记录导入模板.xlsx')
        worksheet = workbook.add_worksheet('导入模板')
        
        # 定义样式
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#4472C4',
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        example_format = workbook.add_format({
            'bg_color': '#E2EFDA',
            'border': 1,
            'align': 'center'
        })
        
        instruction_format = workbook.add_format({
            'bg_color': '#FFF2CC',
            'border': 1,
            'text_wrap': True
        })
        
        category_format = workbook.add_format({
            'bg_color': '#F2F2F2',
            'border': 1,
            'align': 'center'
        })
        
        # 设置列宽
        worksheet.set_column('A:A', 12)  # 日期
        worksheet.set_column('B:B', 10)  # 金额
        worksheet.set_column('C:C', 8)   # 类型
        worksheet.set_column('D:D', 10)  # 分类
        worksheet.set_column('E:E', 20)  # 描述
        worksheet.set_column('F:F', 10)  # 家庭成员
        
        # 写入表头
        headers = ['日期', '金额', '类型', '分类', '描述', '家庭成员']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # 空行用于用户填写
        for i in range(1, 6):
            for col in range(6):
                worksheet.write(i, col, '', workbook.add_format({'border': 1}))
        
        # 示例数据
        row = 7
        worksheet.write(row, 0, '### 示例数据 ###', instruction_format)
        
        example_data = [
            ['2024-01-15', -25.50, '支出', '餐饮', '午餐', ''],
            ['2024-01-14', -50.00, '支出', '交通', '地铁卡充值', ''],
            ['2024-01-14', 5000.00, '收入', '工资', '月薪', ''],
            ['2024-01-13', -156.80, '支出', '购物', '超市购物', '张三'],
            ['2024-01-12', -58.00, '支出', '娱乐', '电影票', ''],
            ['2024-01-11', 200.00, '收入', '兼职', '兼职收入', ''],
            ['2024-01-10', -35.00, '支出', '通讯', '手机话费', ''],
            ['2024-01-09', -120.00, '支出', '服饰', '冬装', '李四']
        ]
        
        for i, data_row in enumerate(example_data):
            for col, value in enumerate(data_row):
                worksheet.write(row + 1 + i, col, value, example_format)
        
        # 字段说明
        row += len(example_data) + 3
        worksheet.write(row, 0, '### 字段说明 ###', instruction_format)
        
        instructions = [
            ['日期', '记账发生日期，格式YYYY-MM-DD', '', '', '', ''],
            ['金额', '正数表示收入，负数表示支出', '', '', '', ''],
            ['类型', '收入 或 支出（或INCOME/EXPENSE）', '', '', '', ''],
            ['分类', '见下方标准分类列表', '', '', '', ''],
            ['描述', '可选，记账详细说明（最多200字符）', '', '', '', ''],
            ['家庭成员', '可选，仅家庭账本需要填写', '', '', '', '']
        ]
        
        for i, inst_row in enumerate(instructions):
            for col, value in enumerate(inst_row):
                worksheet.write(row + 1 + i, col, value, instruction_format)
        
        # 标准分类
        row += len(instructions) + 3
        worksheet.write(row, 0, '### 标准支出分类 ###', instruction_format)
        
        expense_categories = [
            ['餐饮', '购物', '日用', '交通', '运动', '娱乐'],
            ['通讯', '服饰', '美容', '居家', '孩子', '长辈'],
            ['社交', '旅行', '数码', '汽车', '医疗', '还款'],
            ['保险', '学习', '办公', '维修', '利息', '']
        ]
        
        for i, cat_row in enumerate(expense_categories):
            for col, value in enumerate(cat_row):
                worksheet.write(row + 1 + i, col, value, category_format)
        
        row += len(expense_categories) + 2
        worksheet.write(row, 0, '### 标准收入分类 ###', instruction_format)
        
        income_categories = [
            ['工资', '兼职', '理财', '奖金', '提成', '其他']
        ]
        
        for i, cat_row in enumerate(income_categories):
            for col, value in enumerate(cat_row):
                worksheet.write(row + 1 + i, col, value, category_format)
        
        # 冻结首行
        worksheet.freeze_panes(1, 0)
        
        # 添加数据验证
        # 类型字段验证
        worksheet.data_validation('C2:C1000', {
            'validate': 'list',
            'source': ['收入', '支出', 'INCOME', 'EXPENSE']
        })
        
        workbook.close()
        print("✅ Excel模板文件已创建: 记账记录导入模板.xlsx")
        
    except ImportError:
        print("⚠️  需要安装xlsxwriter库才能创建Excel文件")
        print("   运行命令: pip install xlsxwriter")

def create_simple_csv():
    """创建简化版CSV模板"""
    simple_data = [
        ['日期', '金额', '类型', '分类', '描述', '家庭成员'],
        ['2024-01-15', '-25.50', '支出', '餐饮', '午餐', ''],
        ['2024-01-14', '-50.00', '支出', '交通', '地铁卡充值', ''],
        ['2024-01-14', '5000.00', '收入', '工资', '月薪', ''],
        ['2024-01-13', '-156.80', '支出', '购物', '超市购物', '张三'],
        ['2024-01-12', '-58.00', '支出', '娱乐', '电影票', '']
    ]
    
    with open('简化版导入模板.csv', 'w', newline='', encoding='utf-8-sig') as file:
        writer = csv.writer(file)
        writer.writerows(simple_data)
    
    print("✅ 简化版CSV模板文件已创建: 简化版导入模板.csv")

def main():
    """主函数"""
    print("开始创建记账记录导入模板文件...")
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 创建CSV模板
    create_csv_template()
    
    # 创建简化版CSV模板
    create_simple_csv()
    
    # 尝试创建Excel模板
    create_excel_template()
    
    print()
    print("🎉 模板文件创建完成！")
    print("📝 请根据模板说明填写您的记账记录，然后使用导入功能。")

if __name__ == "__main__":
    main() 