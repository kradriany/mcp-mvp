const path = require('path');
const express = require('express');
const SwaggerUI = require('swagger-ui-express');
const OpenAPIBackend = require('openapi-backend').default;

// 1. Load your OpenAPI definition
const api = new OpenAPIBackend({ definition: path.join(__dirname, 'device-api.yaml') });

api.register({
  // If no matching path+method, return 404
  notFound: (ctx, req, res) => {
    res.status(404).json({ error: 'Operation not found in spec' });
  },
  // For defined operations without a custom handler, return the example
  notImplemented: (ctx, req, res) => {
    const mock = ctx.api.mockResponseForOperation(req);
    res.status(mock.status || 200).json(mock.body);
  }
});

api.init();

const app = express();
app.use(express.json());

// 3. Serve the raw spec at /device-api.yaml
app.get('/device-api.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, 'device-api.yaml'));
});

// 4. Serve Swagger UI at /docs
app.use(
  '/docs',
  SwaggerUI.serve,
  SwaggerUI.setup(null, { swaggerOptions: { url: '/device-api.yaml' } })
);

// 5. Forward all other requests to the mock handler
app.use((req, res) => api.handleRequest(req, req, res));

// 6. Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Emulator listening on http://localhost:${PORT}`);
});
