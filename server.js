const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

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
  res.json({ 
    success: true, 
    room: parseInt(roomId), 
    power: parseFloat(power),
    timestamp: new Date().toISOString()
  });
});

// 飞书机器人专用接口
app.post("/api/feishu/query", async (req, res) => {
  let roomId;
  
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
      console.log("解析 JSON 成功，原始房间号:", roomId);
      
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

  const message = `╔═══════════════════╗
${emoji} 【电量查询】
╚═══════════════════╝

🏠 房间号：${roomIdStr}
⚡ 剩余电量：${powerNum.toFixed(2)} 度
📊 状态：${status}

🕐 更新时间：${timeStr}
━━━━━━━━━━━━━━━━━━━`;

  
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});

