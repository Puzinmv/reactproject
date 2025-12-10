const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/v1/chat/completions',
    createProxyMiddleware({
      target: 'https://api.deepseek.com',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
    })
  );
};


