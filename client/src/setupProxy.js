const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for Ollama API
  app.use(
    '/ollama',
    createProxyMiddleware({
      target: 'http://localhost:11434',
      changeOrigin: true,
      pathRewrite: {
        '^/ollama': '', // remove /ollama prefix when forwarding
      },
    })
  );
};
