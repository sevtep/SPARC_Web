const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for LLM API
  app.use(
    '/llm',
    createProxyMiddleware({
      target: 'https://game.agaii.org',
      changeOrigin: true,
      secure: true,
      onProxyRes: (proxyRes, req, res) => {
        // Fix duplicate CORS headers from server
        delete proxyRes.headers['access-control-allow-origin'];
        delete proxyRes.headers['access-control-allow-methods'];
        delete proxyRes.headers['access-control-allow-headers'];
      }
    })
  );
};
