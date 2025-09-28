-- H5支付订单表
-- 用于存储Android客户端通过H5支付API创建的订单信息

CREATE TABLE IF NOT EXISTS h5_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL,
    out_trade_no VARCHAR(255) NOT NULL UNIQUE,
    trade_no VARCHAR(255),
    amount INTEGER NOT NULL, -- 金额，单位：分
    pay_type VARCHAR(50) NOT NULL, -- 支付类型：wechat, alipay
    description TEXT NOT NULL,
    attach TEXT, -- 附加数据
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, FAILED, EXPIRED
    expire_time TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_h5_payment_orders_user_id ON h5_payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_h5_payment_orders_out_trade_no ON h5_payment_orders(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_h5_payment_orders_trade_no ON h5_payment_orders(trade_no);
CREATE INDEX IF NOT EXISTS idx_h5_payment_orders_status ON h5_payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_h5_payment_orders_created_at ON h5_payment_orders(created_at);

-- 添加注释
COMMENT ON TABLE h5_payment_orders IS 'H5支付订单表，存储Android客户端的支付订单信息';
COMMENT ON COLUMN h5_payment_orders.user_id IS '用户ID';
COMMENT ON COLUMN h5_payment_orders.product_id IS '产品ID，对应订阅会员类型';
COMMENT ON COLUMN h5_payment_orders.out_trade_no IS '商户订单号，唯一标识';
COMMENT ON COLUMN h5_payment_orders.trade_no IS '第三方支付平台订单号';
COMMENT ON COLUMN h5_payment_orders.amount IS '支付金额，单位：分';
COMMENT ON COLUMN h5_payment_orders.pay_type IS '支付类型：wechat(微信), alipay(支付宝)';
COMMENT ON COLUMN h5_payment_orders.description IS '订单描述';
COMMENT ON COLUMN h5_payment_orders.attach IS '附加数据，支付成功后原样返回';
COMMENT ON COLUMN h5_payment_orders.status IS '订单状态：PENDING(待支付), PAID(已支付), FAILED(失败), EXPIRED(过期)';
COMMENT ON COLUMN h5_payment_orders.expire_time IS '订单过期时间';
COMMENT ON COLUMN h5_payment_orders.paid_at IS '支付完成时间';
