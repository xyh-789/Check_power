# 寝室电量查询系统

实时查询寝室剩余电量的 Web 应用。

## 功能特性

- 输入房间号查询电量
- 实时显示剩余电量
- 根据电量自动显示状态（充足/偏低/不足）
- **433 寝室昨日用电量查询**（每天凌晨 0:00 自动记录）
- 数据持久化存储（MongoDB）
- 响应式设计，支持手机和电脑访问

## 本地运行

### 快速开始

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量（可选，不配置则使用本地 MongoDB）：
```bash
# Windows PowerShell
$env:MONGODB_URI="your_mongodb_connection_string"

# Linux/Mac
export MONGODB_URI="your_mongodb_connection_string"
```

3. 启动服务器：
```bash
npm start
```

4. 访问 `http://localhost:3000`

### 完整配置（包含昨日用电量功能）

详细配置步骤请查看 [SETUP.md](./SETUP.md)，包括：
- MongoDB 数据库设置（MongoDB Atlas 或阿里云 MongoDB）
- 阿里云服务器环境变量配置
- 定时任务设置（使用系统 cron 或阿里云云监控）

## 在线部署

### 使用阿里云 ECS 部署

**详细部署步骤请查看 [DEPLOY_ALIYUN.md](./DEPLOY_ALIYUN.md)**

### 快速部署

1. **购买阿里云 ECS 服务器**
   - 访问 https://www.aliyun.com/product/ecs
   - 选择适合的配置（推荐：1核2G，CentOS 7+ 或 Ubuntu 20.04+）
   - 配置安全组，开放 80、443、3000 端口

2. **连接服务器并安装环境**
   ```bash
   # 更新系统
   sudo yum update -y  # CentOS
   # 或
   sudo apt update && sudo apt upgrade -y  # Ubuntu
   
   # 安装 Node.js 18+
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -  # CentOS
   sudo yum install -y nodejs
   # 或
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -  # Ubuntu
   sudo apt-get install -y nodejs
   
   # 安装 PM2（进程管理）
   sudo npm install -g pm2
   
   # 安装 Nginx（可选，用于反向代理）
   sudo yum install -y nginx  # CentOS
   # 或
   sudo apt install -y nginx  # Ubuntu
   ```

3. **部署应用**
   ```bash
   # 克隆项目
   git clone <your-repo-url>
   cd check_power
   
   # 安装依赖
   npm install
   
   # 配置环境变量
   # 编辑 ~/.bashrc 或创建 .env 文件
   export MONGODB_URI="your_mongodb_connection_string"
   export PORT=3000
   
   # 使用 PM2 启动应用
   pm2 start server.js --name check-power
   pm2 save
   pm2 startup  # 设置开机自启
   ```

4. **配置 Nginx 反向代理（推荐）**
   - 参考 `nginx.conf.example` 配置文件
   - 配置域名和 SSL 证书（可选）

**特点**：
- ✅ 稳定可靠，国内访问速度快
- ✅ 完全控制服务器环境
- ✅ 支持自定义域名和 SSL
- ✅ 可使用系统 cron 定时任务

**详细部署步骤请查看 [DEPLOY_ALIYUN.md](./DEPLOY_ALIYUN.md)**

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript
- **数据获取**：Axios + Cheerio
- **数据库**：MongoDB (Mongoose)
- **定时任务**：node-cron + 系统 cron（或阿里云云监控）

## License

MIT

