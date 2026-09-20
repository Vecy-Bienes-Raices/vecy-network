module.exports = {
  apps: [
    {
      name: "jania-server",
      script: "dist-server/index.js",
      cwd: "/var/www/vecy-network",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1500M",
      kill_timeout: 6000,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
