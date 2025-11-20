const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const mongoose = require("mongoose");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 连接字符串（从环境变量读取）
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/check_power";
// 监控的寝室号
const MONITORED_ROOM = "433";

// 定义数据模型
const powerDataSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  yesterday: { type: Number, default: null },
  today: { type: Number, default: null },
  lastUpdate: { type: Date, default: Date.now }
});

const PowerData = mongoose.model("PowerData", powerDataSchema);

// 连接 MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB 连接成功");
  })
  .catch((err) => {
    console.error("❌ MongoDB 连接失败:", err.message);
  });

// 飞书请求特殊处理 - 必须在其他中间件之前
app.use('/api/feishu', express.raw({ type: '*/*' }));

// 解析 JSON 请求体
app.use(express.json());
// 解析 URL 编码的表单数据
app.use(express.urlencoded({ extended: true }));
// 解析纯文本
app.use(express.text());

// 提供静态文件服务
app.use(express.static("public"));

// 读取电量数据
async function readPowerData(roomId) {
  try {
    const data = await PowerData.findOne({ roomId });
    return data;
  } catch (e) {
    console.error("读取数据失败:", e.message);
    return null;
  }
}

// 保存电量数据
async function savePowerData(roomId, yesterday, today) {
  try {
    const data = await PowerData.findOneAndUpdate(
      { roomId },
      { 
        yesterday, 
        today, 
        lastUpdate: new Date() 
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    console.log("数据已保存:", data);
    return data;
  } catch (e) {
    console.error("保存数据失败:", e.message);
    return null;
  }
}

// 每天 0 点更新电量数据
async function updateDailyPower() {
  console.log("========== 执行每日电量更新 ==========");
  console.log("时间:", new Date().toLocaleString("zh-CN"));
  
  const power = await fetchPower(MONITORED_ROOM);
  if (!power) {
    console.error("无法获取 433 寝室电量，跳过本次更新");
    return;
  }

  const powerNum = parseFloat(power);
  
  // 读取现有数据
  const existingData = await readPowerData(MONITORED_ROOM);
  
  let yesterday = null;
  let today = powerNum;
  
  // 如果有今日数据，将其移到昨日
  if (existingData && existingData.today !== null) {
    yesterday = existingData.today;
  }
  
  // 保存新的数据
  await savePowerData(MONITORED_ROOM, yesterday, today);
  console.log(`433 寝室电量已更新: 昨日 0 点 ${yesterday} 度, 今日 0 点 ${today} 度`);
  console.log("=======================================");
}

async function fetchPower(roomId) {
  try {
    const url = `https://www.cqie.edu.cn:809/epay/wxpage/wanxiao/eleresult?sysid=1&roomid=${roomId}&areaid=2&buildid=6`;
    const resp = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 9; SM-S9110 Build/PQ3A.190605.09291615; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.131 Mobile Safari/537.36 Wanxiao/5.8.9 Wmxy/5.8.22"
      }
    });
    const html = resp.data;
    const $ = cheerio.load(html);

    // 提取电量
    const text = $("body").text();
    const match = text.match(/剩余电量[\s\S]*?(\d+\.?\d*)度/);

    if (!match) return null;
    return match[1];
  } catch (e) {
    console.error("获取电量失败:", e.message);
    return null;
  }
}

// API 接口：访问 http://localhost:3000/api/power?room=333
app.get("/api/power", async (req, res) => {
  const roomId = req.query.room;
  
  // 验证房间号
  if (!roomId) {
    return res.json({ 
      success: false, 
      msg: "请提供房间号" 
    });
  }
  
  if (!/^\d+$/.test(roomId)) {
    return res.json({ 
      success: false, 
      msg: "房间号格式不正确" 
    });
  }

  const power = await fetchPower(roomId);
  if (!power) {
    return res.json({ 
      success: false, 
      msg: "无法获取电量，请检查房间号是否正确或学校系统暂时不可用" 
    });
  }
  
  const responseData = { 
    success: true, 
    room: parseInt(roomId), 
    power: parseFloat(power),
    timestamp: new Date().toISOString()
  };
  
  // 只对 433 寝室添加昨日用电量
  if (roomId === MONITORED_ROOM) {
    const data = await readPowerData(MONITORED_ROOM);
    if (data && data.yesterday !== null && data.today !== null) {
      const yesterdayUsage = data.yesterday - data.today;
      responseData.yesterdayUsage = parseFloat(yesterdayUsage.toFixed(2));
      responseData.yesterdayPower = data.yesterday;
      responseData.todayPower = data.today;
    }
  }
  
  res.json(responseData);
});

// 手动触发电量更新的接口（供 cron-job.org 调用）
app.get("/api/update-daily-power", async (req, res) => {
  console.log("收到手动更新请求");
  
  try {
    await updateDailyPower();
    res.json({ 
      success: true, 
      message: "电量数据已更新",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("手动更新失败:", error);
    res.json({ 
      success: false, 
      message: "更新失败: " + error.message 
    });
  }
});

// 飞书机器人专用接口
app.post("/api/feishu/query", async (req, res) => {
  let roomId;
  let isAutoQuery = false;
  try {
    // 获取原始数据
    const rawBody = req.body.toString('utf8');
    
    // 打印请求信息用于调试
    console.log("========== 飞书请求信息 ==========");
    console.log("请求头 Content-Type:", req.headers['content-type']);
    console.log("原始请求体:", rawBody);
    console.log("请求体长度:", rawBody.length);
    console.log("请求体字符码:", Array.from(rawBody).map(c => c.charCodeAt(0)).join(','));
    console.log("req.query:", JSON.stringify(req.query, null, 2));
    console.log("=====================================");
    
    // 尝试解析 JSON（先清理格式）
    try {
      // 更严格地清理 JSON：去掉所有控制字符，只保留必要的空格
      let cleanedBody = rawBody
        .replace(/[\r\n\t]/g, '')  // 去掉换行和制表符
        .replace(/\s+/g, ' ')       // 多个空格变一个
        .trim();
      
      console.log("清理后的请求体:", cleanedBody);
      console.log("清理后长度:", cleanedBody.length);
      
      const jsonBody = JSON.parse(cleanedBody);
      roomId = jsonBody.room || jsonBody.roomId || jsonBody.roomid;
      isAutoQuery = jsonBody.auto === true;  // 获取自动查询标志
      console.log("解析 JSON 成功，原始房间号:", roomId, "自动查询:", isAutoQuery);
      
      // 处理飞书变量模板 {{xxx}}
      if (roomId && typeof roomId === 'string') {
        const match = roomId.match(/\{\{(.+?)\}\}/);
        if (match) {
          roomId = match[1].trim();
          console.log("从模板中提取房间号:", roomId);
        }
      }
    } catch (e) {
      // JSON 解析失败，当作纯文本处理
      console.log("JSON 解析失败，当作纯文本处理，错误:", e.message);
      roomId = rawBody.trim();
      
      // 尝试从纯文本中提取房间号
      const match = roomId.match(/\{\{(.+?)\}\}/);
      if (match) {
        roomId = match[1].trim();
      }
    }
    
    // 如果还是没有，尝试从 query 参数获取
    if (!roomId) {
      roomId = req.query.room || req.query.roomId || req.query.roomid;
    }
  } catch (error) {
    console.error("处理请求出错:", error);
    const errorResponse = {
      message: "❌ 请求处理出错\n\n错误信息：" + error.message
    };
    console.log(">>> 返回异常响应:", JSON.stringify(errorResponse));
    return res.json(errorResponse);
  }
  
  // 验证房间号
  if (!roomId) {
    const errorResponse = { 
      message: "❌ 请提供房间号\n\n使用方式：输入房间号\n例如：433"
    };
    console.log(">>> 返回错误响应（无房间号）:", JSON.stringify(errorResponse));
    return res.json(errorResponse);
  }
  
  const roomIdStr = String(roomId).trim();
  console.log(">>> 最终房间号:", roomIdStr);
  
  if (!/^\d+$/.test(roomIdStr)) {
    const errorResponse = { 
      message: `❌ 房间号格式不正确：${roomIdStr}\n\n请输入纯数字，例如：433`
    };
    console.log(">>> 返回错误响应（格式错误）:", JSON.stringify(errorResponse));
    return res.json(errorResponse);
  }

  const power = await fetchPower(roomIdStr);
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false
  });
  
  if (!power) {
    const errorResponse = { 
      message: `❌ 无法获取电量\n\n房间：${roomIdStr}\n可能原因：\n• 房间号不存在\n• 学校系统暂时不可用\n\n查询时间：${timeStr}`
    };
    console.log(">>> 返回错误响应（无法获取电量）:", JSON.stringify(errorResponse));
    return res.json(errorResponse);
  }

  const powerNum = parseFloat(power);
  let status = "";
  let emoji = "";
  
  if (powerNum > 20) {
    status = "电量充足";
    emoji = "✅";
  } else if (powerNum > 10) {
    status = "电量偏低";
    emoji = "⚠️";
  } else {
    status = "电量不足";
    emoji = "🔴";
  }

  // 获取昨日用电量（仅 433 寝室）
  let yesterdayUsage = null;
  if (roomIdStr === "433") {
    const data = await readPowerData("433");
    if (data && data.yesterday !== null && data.today !== null) {
      yesterdayUsage = data.yesterday - data.today;
    }
  }

  // 特殊处理：433 寝室定时查询时，只在电量小于 5 度时发送警告消息
  if (isAutoQuery && roomIdStr === "433" && powerNum >= 5) {
    // 433 寝室定时查询且电量充足时，返回空消息（飞书不会发送）
    const emptyResponse = { 
      message: "",
      room: roomIdStr,
      power: powerNum,
      status: status,
      timestamp: timeStr
    };
    console.log(">>> 433 寝室定时查询，电量充足，不发送消息");
    return res.json(emptyResponse);
  }
  
  let message;
  if (roomIdStr === "433" && powerNum < 5) {
    // 紧急警告消息
    let warningMsg = `╔═══════════════════╗
🚨 【紧急电量警告】
╚═══════════════════╝

⚠️ 433 寝室电量严重不足！
⚡ 剩余电量：${powerNum.toFixed(2)} 度
🔴 状态：${status}`;
    
    // 添加昨日用电量
    if (yesterdayUsage !== null) {
      warningMsg += `\n📊 昨日用电：${yesterdayUsage.toFixed(2)} 度`;
    }
    
    warningMsg += `

⚠️ 请立即充值，避免断电！

🕐 更新时间：${timeStr}
━━━━━━━━━━━━━━━━━━━`;
    message = warningMsg;
    console.log(">>> 433 寝室电量低于 5 度，发送警告消息");
  } else {
    // 正常显示
    let normalMsg = `╔═══════════════════╗
${emoji} 【这是${roomIdStr}寝室的电量查询】
╚═══════════════════╝

🏠 房间号：${roomIdStr}
⚡ 剩余电量：${powerNum.toFixed(2)} 度`;
    
    // 只对 433 寝室添加昨日用电量
    if (roomIdStr === "433" && yesterdayUsage !== null) {
      normalMsg += `\n📊 昨日用电：${yesterdayUsage.toFixed(2)} 度`;
    }
    
    normalMsg += `
📊 状态：${status}

🕐 更新时间：${timeStr}
━━━━━━━━━━━━━━━━━━━`;
    message = normalMsg;
  }

  
  // 返回 JSON 格式
  const successResponse = { 
    message: message,
    room: roomIdStr,
    power: powerNum,
    status: status,
    timestamp: timeStr
  };
  
  console.log(">>> 返回成功响应:", JSON.stringify(successResponse));
  res.json(successResponse);
});

// 启动定时任务：每天 0:00 执行
cron.schedule("0 0 * * *", () => {
  updateDailyPower();
}, {
  timezone: "Asia/Shanghai"
});

console.log("定时任务已启动：每天 0:00 更新 433 寝室电量数据");

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
  console.log(`监控寝室：${MONITORED_ROOM}`);
});

