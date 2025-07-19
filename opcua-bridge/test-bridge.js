const express = require('express');
const cors = require('cors');
const { OPCUAClient, AttributeIds, StatusCodes } = require('node-opcua');

const app = express();
app.use(cors());
const PORT = 4000;

// Simple in-memory store for the latest value
let latestValue = null;
let readCount = 0;

// OPC UA connection config
const endpointUrl = 'opc.tcp://localhost:4840';
const nodeId = 'ns=2;s=PerlinNoise';

async function startOPCUAPolling() {
  const client = OPCUAClient.create({
    endpointMustExist: false,
    connectionStrategy: {
      maxRetry: 3,
      initialDelay: 1000,
      maxDelay: 10000
    }
  });

  try {
    // Connect to server
    await client.connect(endpointUrl);
    console.log('Connected to OPC UA server');

    // Create session
    const session = await client.createSession();
    console.log('Session created');

    // Poll values every second
    setInterval(async () => {
      try {
        const dataValue = await session.read({
          nodeId: nodeId,
          attributeId: AttributeIds.Value
        });

        if (dataValue.statusCode === StatusCodes.Good) {
          latestValue = dataValue.value.value;
          readCount++;
          console.log(`[${readCount}] Read value: ${latestValue}`);
        } else {
          console.log('Bad status code:', dataValue.statusCode.toString());
        }
      } catch (err) {
        console.error('Error reading:', err.message);
      }
    }, 1000);

  } catch (err) {
    console.error('Connection error:', err.message);
    setTimeout(() => startOPCUAPolling(), 5000); // Retry after 5 seconds
  }
}

// REST endpoint
app.get('/opcua/latest', (req, res) => {
  console.log(`API request #${readCount} - latestValue: ${latestValue}`);
  if (latestValue !== null) {
    res.json({ value: latestValue, readCount: readCount });
  } else {
    res.status(503).json({ error: 'No value yet', readCount: readCount });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Test OPC UA Bridge listening on http://localhost:${PORT}`);
  startOPCUAPolling();
});