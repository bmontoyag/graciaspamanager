// Procesos de PM2 en producción. Pensado para una instancia de 1 GB (e2-micro) que además corre Postgres:
// cada proceso tiene un tope de memoria y PM2 lo reinicia de forma controlada si lo supera.
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'dist/src/main.js',
      node_args: '--max-old-space-size=256',
      max_memory_restart: '350M',
      exp_backoff_restart_delay: 1000,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'frontend',
      cwd: './web-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      node_args: '--max-old-space-size=256',
      max_memory_restart: '400M',
      exp_backoff_restart_delay: 1000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
