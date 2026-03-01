const { createProxyMiddleware } = require('http-proxy-middleware');

const TRUECONF_TARGET = 'https://trueconf.asterit.ru';
const TRUECONF_PROXY_COOKIE = String(process.env.TRUECONF_PROXY_COOKIE || '').trim();

const rewriteSetCookieForLocalhost = (setCookieHeader) => {
  if (!Array.isArray(setCookieHeader) || !setCookieHeader.length) {
    return setCookieHeader;
  }

  return setCookieHeader.map((cookieValue) => String(cookieValue || '')
    .replace(/;\s*Domain=[^;]*/gi, '; Domain=localhost')
    .replace(/;\s*Secure/gi, '')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax'));
};

module.exports = function(app) {
  app.get('/trueconf-proxy/meta', (_req, res) => {
    res.json({
      enabled: true,
      target: TRUECONF_TARGET,
      proxyCookieConfigured: Boolean(TRUECONF_PROXY_COOKIE),
    });
  });

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

  app.use(
    '/trueconf',
    createProxyMiddleware({
      target: TRUECONF_TARGET,
      changeOrigin: true,
      secure: true,
      timeout: 300000,
      proxyTimeout: 300000,
      pathRewrite: { '^/trueconf': '' },
      onProxyReq: (proxyReq, req) => {
        if (proxyReq.removeHeader) {
          proxyReq.removeHeader('origin');
          proxyReq.removeHeader('referer');
        }

        if (TRUECONF_PROXY_COOKIE) {
          const incomingCookie = String(req.headers.cookie || '').trim();
          const mergedCookie = incomingCookie
            ? `${incomingCookie}; ${TRUECONF_PROXY_COOKIE}`
            : TRUECONF_PROXY_COOKIE;
          proxyReq.setHeader('cookie', mergedCookie);
        }
      },
      onProxyRes: (proxyRes) => {
        const rewrittenCookies = rewriteSetCookieForLocalhost(proxyRes.headers['set-cookie']);
        if (rewrittenCookies && rewrittenCookies.length) {
          proxyRes.headers['set-cookie'] = rewrittenCookies;
        }
      },
    })
  );
};
