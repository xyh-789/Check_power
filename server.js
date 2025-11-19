const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

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
  // 打印请求信息用于调试
  console.log("========== 飞书请求信息 ==========");
  console.log("请求头 Content-Type:", req.headers['content-type']);
  console.log("req.body 类型:", typeof req.body);
  console.log("req.body 内容:", JSON.stringify(req.body, null, 2));
  console.log("req.query 内容:", JSON.stringify(req.query, null, 2));
  console.log("原始请求体:", req.body);
  console.log("=====================================");
  
  // 支持多种请求格式
  let roomId;
  
  // 尝试从不同位置获取房间号
  if (typeof req.body === 'string') {
    // 纯文本格式：直接是房间号
    roomId = req.body.trim();
  } else if (typeof req.body === 'object') {
    // JSON 或表单格式
    roomId = req.body.room || req.body.roomId || req.body.roomid;
  }
  
  // 如果还是没有，尝试从 query 参数获取
  if (!roomId) {
    roomId = req.query.room || req.query.roomId || req.query.roomid;
  }
  
  // 验证房间号
  if (!roomId) {
    return res.json({ 
      message: "❌ 请提供房间号\n\n使用方式：输入房间号\n例如：433"
    });
  }
  
  const roomIdStr = String(roomId).trim();
  if (!/^\d+$/.test(roomIdStr)) {
    return res.json({ 
      message: `❌ 房间号格式不正确：${roomIdStr}\n\n请输入纯数字，例如：433`
    });
  }

  const power = await fetchPower(roomIdStr);
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false
  });
  
  if (!power) {
    return res.json({ 
      message: `❌ 无法获取电量\n\n房间：${roomIdStr}\n可能原因：\n• 房间号不存在\n• 学校系统暂时不可用\n\n查询时间：${timeStr}`
    });
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

  const message = `${emoji} 【电量查询】\n\n房间号：        ${roomIdStr}\n剩余电量：    ${powerNum.toFixed(2)} 度\n状态：            ${status}\n\n更新时间：${timeStr}`;
  
  // 返回 JSON 格式
  res.json({ 
    message: message,
    room: roomIdStr,
    power: powerNum,
    status: status,
    timestamp: timeStr
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});

