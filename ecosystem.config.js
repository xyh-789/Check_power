// PM2 配置文件
// 使用方式：pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'check-power',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // 从系统环境变量读取，或直接在这里填写
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/check_power'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

