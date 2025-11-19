# 配置说明

## 1. MongoDB Atlas 设置

### 1.1 创建免费集群
1. 访问 https://www.mongodb.com/cloud/atlas/register
2. 注册并登录 MongoDB Atlas
3. 点击 "Build a Database" 创建免费集群（M0 Sandbox）
4. 选择离你最近的区域（推荐：AWS Singapore 或 Google Cloud Taiwan）

### 1.2 创建数据库用户
1. 左侧菜单 -> Database Access -> Add New Database User
2. 选择 "Password" 认证方式
3. 设置用户名和密码（记住这些信息）
4. 权限选择 "Read and write to any database"

### 1.3 配置网络访问
1. 左侧菜单 -> Network Access -> Add IP Address
2. 点击 "Allow Access from Anywhere"（选择 0.0.0.0/0）
3. 点击 Confirm

### 1.4 获取连接字符串
1. 左侧菜单 -> Database -> Connect
2. 选择 "Connect your application"
3. Driver 选择 "Node.js"，Version 选择 "5.5 or later"
4. 复制连接字符串，格式如下：
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
5. 将 `<username>` 和 `<password>` 替换为你的实际用户名和密码

## 2. Render 环境变量配置

1. 登录 Render Dashboard
2. 选择你的服务 -> Environment
3. 添加环境变量：
   - Key: `MONGODB_URI`
   - Value: 你的 MongoDB 连接字符串（例如：mongodb+srv://user:pass@cluster.mongodb.net/check_power?retryWrites=true&w=majority）

**完整示例：**
```
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/check_power?retryWrites=true&w=majority
```

## 3. cron-job.org 定时任务设置

### 3.1 注册账号
1. 访问 https://cron-job.org/en/signup/
2. 注册并登录

### 3.2 创建定时任务
1. 点击 "Cronjobs" -> "Create cronjob"
2. 填写以下信息：
   - **Title**: Daily Power Update (433)
   - **URL**: `https://你的服务域名.onrender.com/api/update-daily-power`
   - **Schedule**: 
     - Type: Every day
     - Execute at: 00:00 (凌晨 0 点)
     - Timezone: Asia/Shanghai (GMT+8)
   - **Request method**: GET
   - **Notification settings**: 
     - 勾选 "Notify me on execution failures"（可选）
3. 点击 "Create cronjob"

### 3.3 测试任务
1. 在 cronjob 列表中找到刚创建的任务
2. 点击右侧的 "Execute now" 立即执行测试
3. 检查执行记录，确认返回成功

## 4. 测试和验证

### 4.1 本地测试
```bash
# 安装依赖
npm install

# 设置环境变量（Windows PowerShell）
$env:MONGODB_URI="your_mongodb_connection_string"

# 启动服务器
npm start
```

### 4.2 测试接口
1. 访问：`http://localhost:3000/api/update-daily-power`
   - 应该返回成功消息
2. 查询 433 寝室：`http://localhost:3000/api/power?room=433`
   - 如果有数据，应该包含 `yesterdayUsage` 字段

### 4.3 部署到 Render
1. 推送代码到 GitHub
2. Render 会自动部署
3. 等待部署完成
4. 测试线上接口

## 5. 故障排查

### MongoDB 连接失败
- 检查连接字符串是否正确
- 确认 IP 白名单设置为 0.0.0.0/0
- 检查用户名密码是否正确

### 定时任务未执行
- 检查 cron-job.org 执行日志
- 确认 URL 地址正确
- 检查 Render 服务是否在线

### 数据未保存
- 检查 MongoDB 连接是否成功
- 查看服务器日志
- 手动调用 `/api/update-daily-power` 测试

