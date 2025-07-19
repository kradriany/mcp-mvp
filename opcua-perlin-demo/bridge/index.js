const express = require('express');
const cors = require('cors');
const { OPCUAClient, AttributeIds, ClientSubscription, TimestampsToReturn } = require('node-opcua');

const app = express();
const port = 4001;
const opcuaEndpoint = 'opc.tcp://localhost:4842';
const nodeId = 'ns=1;i=1001';

let latestValue = null;
let connectionStatus = 'disconnected';
let lastError = null;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// OPC UA Client setup
let client = null;
let session = null;
let subscription = null;

async function connectToOPCUA() {
  try {
    console.log('Connecting to OPC UA server...');
    client = OPCUAClient.create({
      endpointMustExist: false,
      connectionStrategy: {
        initialDelay: 1000,
        maxRetry: 3
      }
    });

    await client.connect(opcuaEndpoint);
    console.log('Connected to OPC UA server');
    
    session = await client.createSession();
    console.log('Session created');
    
    // Poll the value every second
    const pollValue = async () => {
      try {
        const dataValue = await session.read({
          nodeId: nodeId,
          attributeId: AttributeIds.Value
        });
        
        if (dataValue.statusCode.isGood()) {
          latestValue = dataValue.value.value;
          connectionStatus = 'connected';
          lastError = null;
          console.log(`Polled value: ${latestValue}`);
        }
      } catch (error) {
        console.error('Error reading value:', error.message);
        lastError = error.message;
      }
    };
    
    // Start polling every 2 seconds
    setInterval(pollValue, 2000);
    
    // Initial read
    await pollValue();

    connectionStatus = 'connected';
    lastError = null;
    
  } catch (error) {
    console.error('Error connecting to OPC UA:', error.message);
    connectionStatus = 'disconnected';
    lastError = error.message;
    
    // Retry connection after 5 seconds
    setTimeout(connectToOPCUA, 5000);
  }
}

// Handle connection errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  connectionStatus = 'disconnected';
  lastError = reason.message || reason;
});

// REST API endpoints
app.get('/opcua/latest', (req, res) => {
  if (connectionStatus === 'connected' && latestValue !== null) {
    res.json({ 
      value: latestValue,
      timestamp: new Date().toISOString(),
      status: connectionStatus
    });
  } else {
    res.status(503).json({ 
      error: lastError || 'No data available',
      status: connectionStatus,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/opcua/status', (req, res) => {
  res.json({
    status: connectionStatus,
    lastError: lastError,
    hasData: latestValue !== null,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(port, () => {
  console.log(`OPC UA Bridge running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log(`  GET /opcua/latest - Get latest Perlin noise value`);
  console.log(`  GET /opcua/status - Get connection status`);
  console.log(`  GET /health - Health check`);
  
  // Start OPC UA connection
  connectToOPCUA();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down bridge...');
  
  if (subscription) {
    await subscription.terminate();
  }
  
  if (session) {
    await session.close();
  }
  
  if (client) {
    await client.disconnect();
  }
  
  process.exit(0);
});