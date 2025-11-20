#!/bin/bash
# 阿里云服务器部署脚本
# 使用方法：chmod +x deploy.sh && ./deploy.sh

echo "========================================="
echo "开始部署寝室电量查询系统到阿里云服务器"
echo "========================================="

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 未安装，正在安装..."
    npm install -g pm2
fi

echo "✅ PM2 已安装"

# 安装项目依赖
echo ""
echo "正在安装项目依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 检查环境变量
if [ -z "$MONGODB_URI" ]; then
    echo ""
    echo "⚠️  警告: MONGODB_URI 环境变量未设置"
    echo "请设置环境变量或创建 .env 文件"
    echo ""
    read -p "是否继续部署? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 创建日志目录
mkdir -p logs

# 停止旧进程（如果存在）
pm2 stop check-power 2>/dev/null
pm2 delete check-power 2>/dev/null

# 启动应用
echo ""
echo "正在启动应用..."
pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
    echo "✅ 应用启动成功"
    
    # 保存 PM2 配置
    pm2 save
    
    # 设置开机自启
    echo ""
    echo "正在设置开机自启..."
    pm2 startup
    
    echo ""
    echo "========================================="
    echo "✅ 部署完成！"
    echo "========================================="
    echo ""
    echo "常用命令："
    echo "  查看状态: pm2 list"
    echo "  查看日志: pm2 logs check-power"
    echo "  重启应用: pm2 restart check-power"
    echo "  停止应用: pm2 stop check-power"
    echo ""
    echo "应用运行在: http://localhost:3000"
    echo "========================================="
else
    echo "❌ 应用启动失败"
    exit 1
fi

