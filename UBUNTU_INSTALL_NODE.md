# Ubuntu 安装 Node.js 解决方案

如果 `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -` 命令卡住，可以使用以下方法：

## 方法一：使用国内镜像源（推荐，最快）

### 使用淘宝镜像

```bash
# 先中断当前命令（按 Ctrl+C）

# 使用淘宝镜像安装 Node.js 18
curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/nodesource/deb/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 或使用中科大镜像

```bash
curl -fsSL https://mirrors.ustc.edu.cn/nodesource/deb/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 方法二：使用 NVM（Node Version Manager，推荐）

NVM 可以方便地管理多个 Node.js 版本，且使用国内镜像速度快：

```bash
# 安装 NVM
curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash

# 或者使用 GitHub（如果网络好）
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载 shell 配置
source ~/.bashrc

# 使用淘宝镜像安装 Node.js 18
export NVM_NODEJS_ORG_MIRROR=https://npm.taobao.org/mirrors/node
nvm install 18
nvm use 18
nvm alias default 18

# 验证安装
node -v
npm -v
```

## 方法三：直接下载二进制文件（最快）

```bash
# 下载 Node.js 18 LTS 二进制文件
cd /tmp
wget https://nodejs.org/dist/v18.20.4/node-v18.20.4-linux-x64.tar.xz

# 如果上面太慢，使用淘宝镜像
# wget https://npm.taobao.org/mirrors/node/v18.20.4/node-v18.20.4-linux-x64.tar.xz

# 解压
tar -xf node-v18.20.4-linux-x64.tar.xz

# 移动到系统目录
sudo mv node-v18.20.4-linux-x64 /usr/local/nodejs

# 创建软链接
sudo ln -s /usr/local/nodejs/bin/node /usr/local/bin/node
sudo ln -s /usr/local/nodejs/bin/npm /usr/local/bin/npm
sudo ln -s /usr/local/nodejs/bin/npx /usr/local/bin/npx

# 验证
node -v
npm -v
```

## 方法四：使用 Ubuntu 官方源（版本可能较旧）

```bash
# 更新包列表
sudo apt update

# 安装 Node.js（版本可能不是 18，但通常可用）
sudo apt install -y nodejs npm

# 如果版本太低，可以升级 npm
sudo npm install -g n
sudo n stable  # 或 sudo n 18
```

## 推荐方案

**对于阿里云 Ubuntu 服务器，推荐使用方法二（NVM）**，因为：
- ✅ 安装速度快（使用国内镜像）
- ✅ 可以轻松切换 Node.js 版本
- ✅ 不需要 sudo 权限安装全局包
- ✅ 管理方便

## 安装完成后继续部署

安装好 Node.js 后，继续执行：

```bash
# 安装 PM2
sudo npm install -g pm2

# 验证安装
node -v
npm -v
pm2 -v
```

然后继续按照 DEPLOY_ALIYUN.md 的步骤部署应用。

