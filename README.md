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

## License

MIT

