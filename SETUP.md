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

## 2. 阿里云服务器环境变量配置

### 2.1 方式一：使用环境变量文件（推荐）

在项目根目录创建 `.env` 文件：
```bash
cd /path/to/check_power
nano .env
```

添加以下内容：
```
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/check_power?retryWrites=true&w=majority
PORT=3000
NODE_ENV=production
```

**注意**：如果使用 `.env` 文件，需要在 `server.js` 中使用 `dotenv` 包来加载环境变量。

### 2.2 方式二：使用系统环境变量

编辑 `~/.bashrc` 或 `~/.bash_profile`：
```bash
nano ~/.bashrc
```

添加：
```bash
export MONGODB_URI="mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/check_power?retryWrites=true&w=majority"
export PORT=3000
export NODE_ENV=production
```

使配置生效：
```bash
source ~/.bashrc
```

### 2.3 方式三：使用 PM2 环境变量

使用 PM2 启动时指定环境变量：
```bash
pm2 start server.js --name check-power --update-env \
  --env MONGODB_URI="mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/check_power?retryWrites=true&w=majority" \
  --env PORT=3000 \
  --env NODE_ENV=production
```

或在 `ecosystem.config.js` 中配置（见下方 PM2 配置说明）

## 3. 定时任务设置

### 3.1 方式一：使用系统 cron（推荐）

编辑 crontab：
```bash
crontab -e
```

添加以下行（每天 0:00 执行）：
```bash
0 0 * * * curl -s http://localhost:3000/api/update-daily-power > /dev/null 2>&1
```

或者使用 wget：
```bash
0 0 * * * wget -q -O - http://localhost:3000/api/update-daily-power > /dev/null 2>&1
```

**注意**：如果使用域名，将 `localhost:3000` 替换为你的域名。

### 3.2 方式二：使用阿里云云监控定时任务

1. 登录阿里云控制台
2. 进入 **云监控** -> **站点监控** -> **HTTP(S)监控**
3. 创建监控任务：
   - **任务名称**：Daily Power Update (433)
   - **监控地址**：`http://你的域名/api/update-daily-power`
   - **监控频率**：每天一次
   - **执行时间**：00:00（北京时间）
   - **请求方法**：GET

### 3.3 方式三：使用 node-cron（已内置）

项目已内置 `node-cron`，会在每天 0:00 自动执行。确保服务器时区设置为 `Asia/Shanghai`：
```bash
# 查看时区
timedatectl

# 设置时区（CentOS 7+ / Ubuntu）
sudo timedatectl set-timezone Asia/Shanghai
```

### 3.4 测试定时任务

手动测试：
```bash
curl http://localhost:3000/api/update-daily-power
```

应该返回：
```json
{
  "success": true,
  "message": "电量数据已更新",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

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

### 4.3 部署到阿里云服务器

1. **连接服务器**
   ```bash
   ssh root@your-server-ip
   ```

2. **安装 Node.js 和 PM2**
   ```bash
   # CentOS
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   sudo npm install -g pm2
   
   # Ubuntu
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

3. **克隆项目并安装依赖**
   ```bash
   git clone <your-repo-url>
   cd check_power
   npm install
   ```

4. **配置环境变量**（参考 2.1 或 2.2 节）

5. **使用 PM2 启动应用**
   ```bash
   pm2 start server.js --name check-power
   pm2 save
   pm2 startup  # 设置开机自启
   ```

6. **配置 Nginx 反向代理**（可选，推荐）
   - 参考 `nginx.conf.example` 文件
   - 配置完成后重启 Nginx：`sudo systemctl restart nginx`

7. **测试线上接口**
   ```bash
   curl http://your-domain/api/power?room=433
   ```

## 5. 故障排查

### MongoDB 连接失败
- 检查连接字符串是否正确
- 确认 IP 白名单设置为 0.0.0.0/0
- 检查用户名密码是否正确

### 定时任务未执行
- 检查系统 cron 日志：`grep CRON /var/log/syslog`（Ubuntu）或 `grep CRON /var/log/cron`（CentOS）
- 确认服务器时区设置为 `Asia/Shanghai`
- 手动测试接口：`curl http://localhost:3000/api/update-daily-power`
- 检查 PM2 进程是否运行：`pm2 list`
- 查看应用日志：`pm2 logs check-power`

### 数据未保存
- 检查 MongoDB 连接是否成功
- 查看服务器日志
- 手动调用 `/api/update-daily-power` 测试

