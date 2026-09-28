const app = require('./app');
const config = require('./config');

const start = async () => {
  await app._ensureSeeded;

  const server = app.listen(config.port, () => {
    console.log(
      `\n School Management System API\n` +
        ` Environment : ${config.env}\n` +
        ` Listening on: http://localhost:${config.port}\n` +
        ` Health check: http://localhost:${config.port}/health\n`
    );
  });

  const shutdown = (signal) => () => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    server.close(() => process.exit(1));
  });
};

start();
