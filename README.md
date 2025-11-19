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
- MongoDB Atlas 免费数据库设置
- Render 环境变量配置
- cron-job.org 定时任务设置

## 在线部署

### 使用 Render 部署（推荐，完全免费）

1. **访问 Render**
   - 打开 https://render.com
   - 使用 GitHub 账号登录

2. **创建 Web Service**
   - 点击 "New +" → "Web Service"
   - 选择 `Check_power` 仓库

3. **配置服务**
   - Name: `check-power`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **部署**
   - 点击 "Create Web Service"
   - 等待 2-3 分钟自动部署完成
   - 获得免费的访问链接

**特点**：
- ✅ 完全免费（无需信用卡）
- ✅ 自动 HTTPS
- ✅ GitHub 自动部署
- ✅ 750 小时/月免费运行时间

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript
- **数据获取**：Axios + Cheerio
- **数据库**：MongoDB (Mongoose)
- **定时任务**：node-cron + cron-job.org

## License

MIT

