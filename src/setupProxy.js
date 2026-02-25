const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/directus',
    createProxyMiddleware({
      target: 'http://10.0.0.224:8055',
      changeOrigin: true,
      secure: false,
      timeout: 300000,
      proxyTimeout: 300000,
      pathRewrite: { '^/directus': '' },
      cookieDomainRewrite: 'localhost',
    })
  );

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
