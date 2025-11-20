# 阿里云服务器部署指南

本指南将帮助你将寝室电量查询系统部署到阿里云 ECS 服务器。

## 前置准备

1. **购买阿里云 ECS 服务器**
   - 推荐配置：1核2G，CentOS 7+ 或 Ubuntu 20.04+
   - 确保已配置安全组，开放以下端口：
     - 22 (SSH)
     - 80 (HTTP)
     - 443 (HTTPS，如使用 SSL)
     - 3000 (Node.js 应用，如不使用 Nginx 反向代理)

2. **准备域名（可选）**
   - 如果有域名，可以配置 DNS 解析到服务器 IP
   - 可以申请免费 SSL 证书（阿里云 SSL 证书服务）

## 快速部署步骤

### 1. 连接服务器

```bash
ssh root@your-server-ip
```

### 2. 安装基础环境

#### CentOS 7+

```bash
# 更新系统
sudo yum update -y

# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx（可选）
sudo yum install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### Ubuntu 20.04+

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 方法一：直接下载二进制文件（最快，推荐）
cd /tmp
wget https://npm.taobao.org/mirrors/node/v18.20.4/node-v18.20.4-linux-x64.tar.xz
tar -xf node-v18.20.4-linux-x64.tar.xz
sudo mv node-v18.20.4-linux-x64 /usr/local/nodejs
sudo ln -s /usr/local/nodejs/bin/node /usr/local/bin/node
sudo ln -s /usr/local/nodejs/bin/npm /usr/local/bin/npm
sudo ln -s /usr/local/nodejs/bin/npx /usr/local/bin/npx

# 方法二：使用 Ubuntu 官方源（如果方法一失败，版本可能不是 18）
# sudo apt install -y nodejs npm
# sudo npm install -g n
# sudo n 18

# 验证 Node.js 安装
node -v  # 应该显示 v18.x.x
npm -v

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx（可选）
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3. 部署应用

#### 方式一：使用 Git 克隆（推荐）

```bash
# 克隆项目
cd /opt  # 或其他目录
git clone <your-repo-url> check_power
cd check_power

# 安装依赖
npm install

# 配置环境变量
nano .env
```

在 `.env` 文件中添加：
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/check_power?retryWrites=true&w=majority
PORT=3000
NODE_ENV=production
```

#### 方式二：使用部署脚本

```bash
# 给脚本添加执行权限
chmod +x deploy.sh

# 设置环境变量
export MONGODB_URI="your_mongodb_connection_string"

# 运行部署脚本
./deploy.sh
```

#### 方式三：手动部署

```bash
# 安装依赖
npm install

# 使用 PM2 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. 配置 Nginx 反向代理（推荐）

1. 复制 Nginx 配置示例：
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/check-power
sudo nano /etc/nginx/sites-available/check-power
```

2. 修改配置中的域名：
```nginx
server_name your-domain.com;  # 改为你的域名
```

3. 创建软链接并测试：
```bash
sudo ln -s /etc/nginx/sites-available/check-power /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 配置定时任务

#### 方式一：使用系统 cron（推荐）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天 0:00 执行）
0 0 * * * curl -s http://localhost:3000/api/update-daily-power > /dev/null 2>&1
```

#### 方式二：使用 node-cron（已内置）

确保服务器时区正确：
```bash
# 查看时区
timedatectl

# 设置时区
sudo timedatectl set-timezone Asia/Shanghai
```

应用已内置定时任务，会在每天 0:00 自动执行。

### 6. 配置防火墙

#### CentOS 7+ (firewalld)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Ubuntu (ufw)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

## 验证部署

1. **检查应用状态**
   ```bash
   pm2 list
   pm2 logs check-power
   ```

2. **测试 API 接口**
   ```bash
   curl http://localhost:3000/api/power?room=433
   ```

3. **测试定时任务接口**
   ```bash
   curl http://localhost:3000/api/update-daily-power
   ```

4. **访问 Web 界面**
   打开浏览器访问：`http://your-server-ip:3000` 或 `http://your-domain.com`

## 常用运维命令

### PM2 管理

```bash
# 查看应用状态
pm2 list

# 查看日志
pm2 logs check-power

# 重启应用
pm2 restart check-power

# 停止应用
pm2 stop check-power

# 删除应用
pm2 delete check-power

# 查看详细信息
pm2 info check-power

# 监控
pm2 monit
```

### 更新应用

```bash
cd /path/to/check_power
git pull
npm install
pm2 restart check-power
```

### 查看日志

```bash
# PM2 日志
pm2 logs check-power

# Nginx 日志
sudo tail -f /var/log/nginx/check-power-access.log
sudo tail -f /var/log/nginx/check-power-error.log

# 系统日志
journalctl -u nginx -f
```

## 配置 SSL 证书（HTTPS）

### 使用阿里云 SSL 证书

1. 在阿里云控制台申请免费 SSL 证书
2. 下载证书文件（Nginx 格式）
3. 上传到服务器：`/etc/nginx/ssl/`
4. 修改 Nginx 配置，取消 SSL 相关注释
5. 重启 Nginx：`sudo systemctl restart nginx`

### 使用 Let's Encrypt（免费）

```bash
# 安装 certbot
sudo yum install certbot python3-certbot-nginx  # CentOS
# 或
sudo apt install certbot python3-certbot-nginx  # Ubuntu

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

## 故障排查

### 应用无法启动

1. 检查 Node.js 版本：`node -v`（需要 18+）
2. 检查环境变量：`echo $MONGODB_URI`
3. 查看 PM2 日志：`pm2 logs check-power`
4. 检查端口占用：`netstat -tlnp | grep 3000`

### MongoDB 连接失败

1. 检查连接字符串是否正确
2. 确认 MongoDB 允许服务器 IP 访问
3. 测试网络连接：`curl -v mongodb+srv://...`

### 定时任务未执行

1. 检查系统 cron 日志
2. 确认时区设置：`timedatectl`
3. 手动测试接口：`curl http://localhost:3000/api/update-daily-power`

### Nginx 502 错误

1. 检查 Node.js 应用是否运行：`pm2 list`
2. 检查 Nginx 配置：`sudo nginx -t`
3. 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`

## 安全建议

1. **修改 SSH 默认端口**
2. **使用密钥认证而非密码**
3. **配置防火墙，只开放必要端口**
4. **定期更新系统和依赖**
5. **使用 HTTPS**
6. **设置强密码**
7. **定期备份数据**

## 性能优化

1. **使用 Nginx 反向代理**，减少 Node.js 负载
2. **启用 Nginx 缓存**（静态文件）
3. **使用 PM2 集群模式**（多核 CPU）
4. **配置 MongoDB 连接池**
5. **监控服务器资源使用**

## 联系支持

如遇到问题，请检查：
- PM2 日志：`pm2 logs check-power`
- Nginx 日志：`/var/log/nginx/`
- 系统日志：`journalctl -xe`

