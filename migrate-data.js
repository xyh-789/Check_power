// 数据迁移脚本：将 power_data.json 导入 MongoDB
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// MongoDB 连接字符串
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/check_power";
const DATA_FILE = path.join(__dirname, "power_data.json");

// 定义数据模型
const powerDataSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  yesterday: { type: Number, default: null },
  today: { type: Number, default: null },
  lastUpdate: { type: Date, default: Date.now }
});

const PowerData = mongoose.model("PowerData", powerDataSchema);

async function migrateData() {
  try {
    console.log("连接 MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB 连接成功");

    // 检查文件是否存在
    if (!fs.existsSync(DATA_FILE)) {
      console.log("⚠️  power_data.json 文件不存在，跳过迁移");
      console.log("你可以手动创建初始数据：");
      console.log({
        roomId: "433",
        yesterday: 7.2,
        today: 6.4,
        lastUpdate: new Date()
      });
      process.exit(0);
    }

    // 读取 JSON 文件
    console.log("读取 power_data.json...");
    const jsonData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    console.log("JSON 数据:", jsonData);

    // 转换并导入数据
    for (const [roomId, data] of Object.entries(jsonData)) {
      console.log(`\n导入寝室 ${roomId} 的数据...`);
      
      const powerData = await PowerData.findOneAndUpdate(
        { roomId },
        {
          yesterday: data.yesterday,
          today: data.today,
          lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : new Date()
        },
        { upsert: true, new: true }
      );
      
      console.log("✅ 导入成功:", powerData);
    }

    console.log("\n🎉 数据迁移完成！");
    process.exit(0);
  } catch (error) {
    console.error("❌ 迁移失败:", error);
    process.exit(1);
  }
}

migrateData();

