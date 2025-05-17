'use client';

import { DollarSign, ShoppingBag, CreditCard } from 'lucide-react';

/**
 * 页面预览组件
 */
export function PreviewPage() {
  return (
    <div className="h-[400px] overflow-y-auto border border-border rounded-md">
      <div className="p-4">
        <div className="bg-card rounded-md border border-border p-4 mb-4">
          <div className="font-semibold mb-3">账户概览</div>
          <div className="flex justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">总收入</div>
              <div className="text-success font-semibold">¥8,000</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">总支出</div>
              <div className="text-destructive font-semibold">¥5,000</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">结余</div>
              <div className="text-primary font-semibold">¥3,000</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="font-semibold mb-3">最近交易</div>
          
          <div className="bg-card rounded-md border border-border p-3 mb-2 flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white mr-3">
              <ShoppingBag size={18} />
            </div>
            <div className="flex-1">
              <div className="font-medium">购物</div>
              <div className="text-xs text-muted-foreground">超市</div>
            </div>
            <div className="text-destructive font-semibold">-¥120</div>
          </div>
          
          <div className="bg-card rounded-md border border-border p-3 mb-2 flex items-center">
            <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center text-white mr-3">
              <DollarSign size={18} />
            </div>
            <div className="flex-1">
              <div className="font-medium">工资</div>
              <div className="text-xs text-muted-foreground">月薪</div>
            </div>
            <div className="text-success font-semibold">+¥6,000</div>
          </div>
          
          <div className="bg-card rounded-md border border-border p-3 flex items-center">
            <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center text-white mr-3">
              <CreditCard size={18} />
            </div>
            <div className="flex-1">
              <div className="font-medium">餐饮</div>
              <div className="text-xs text-muted-foreground">午餐</div>
            </div>
            <div className="text-destructive font-semibold">-¥45</div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="font-semibold mb-3">预算进度</div>
          
          <div className="bg-card rounded-md border border-border p-3 mb-2">
            <div className="flex justify-between mb-2">
              <div className="font-medium">餐饮</div>
              <div className="text-sm">
                <span className="font-semibold">¥800</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-muted-foreground">¥1,200</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '66%' }}></div>
            </div>
          </div>
          
          <div className="bg-card rounded-md border border-border p-3">
            <div className="flex justify-between mb-2">
              <div className="font-medium">购物</div>
              <div className="text-sm">
                <span className="font-semibold text-destructive">¥1,500</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-muted-foreground">¥1,000</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-destructive rounded-full" style={{ width: '150%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
