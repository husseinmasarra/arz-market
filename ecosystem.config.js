module.exports = {
  apps: [
    {
      name: 'arzmart-app',
      script: 'backend/src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      max_memory_restart: '800M',
      autorestart: true,
      watch: false
    }
  ]
};
