# 寝室电量查询系统

实时查询寝室剩余电量的 Web 应用。

## 功能特性

- 输入房间号查询电量
- 实时显示剩余电量
- 根据电量自动显示状态（充足/偏低/不足）
- 响应式设计，支持手机和电脑访问

## 本地运行

1. 安装依赖：
```bash
npm install
```

2. 启动服务器：
```bash
npm start
```

3. 访问 `http://localhost:3000`

## 部署方式

### 方式一：Railway 部署（推荐）

1. 注册 [Railway](https://railway.app/) 账号
2. 连接 GitHub 仓库或直接上传代码
3. Railway 会自动检测并部署
4. 获得部署链接

### 方式二：Render 部署

1. 注册 [Render](https://render.com/) 账号
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 构建命令：`npm install`
5. 启动命令：`npm start`

### 方式三：云服务器部署

需要一台 Linux 服务器（如阿里云、腾讯云）。

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript
- **数据获取**：Axios + Cheerio

## License

MIT

