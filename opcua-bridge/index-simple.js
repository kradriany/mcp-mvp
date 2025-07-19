const express = require('express');
const cors = require('cors');
const { OPCUAClient, AttributeIds } = require('node-opcua');

const app = express();
app.use(cors());
const PORT = 4000;

// OPC UA connection config
const endpointUrl = 'opc.tcp://localhost:4840';
const nodeId = 'ns=1;s=PerlinNoise';
const testNodeId = 'ns=0;i=2258'; // Server Status CurrentTime

let latestValue = null;
let client = null;
let session = null;

async function connectAndRead() {
  try {
    if (!client) {
      console.log('Creating OPC UA client...');
      client = OPCUAClient.create({ 
        endpointMustExist: false,
        connectionStrategy: {
          maxRetry: 1,
          initialDelay: 1000,
          maxDelay: 5000
        }
      });
      
      console.log('Connecting to:', endpointUrl);
      await client.connect(endpointUrl);
      console.log('Connected!');
      
      session = await client.createSession();
      console.log('Session created!');
    }
    
    // Try reading the test node first
    const testValue = await session.read({ 
      nodeId: testNodeId, 
      attributeId: AttributeIds.Value 
    });
    console.log('Test node (CurrentTime):', testValue.value.value);
    
    const dataValue = await session.read({ 
      nodeId, 
      attributeId: AttributeIds.Value 
    });
    
    console.log('Full dataValue:', JSON.stringify(dataValue, null, 2));
    latestValue = dataValue.value.value;
    console.log('Read value:', latestValue);
    
  } catch (err) {
    console.error('Error:', err.message);
    // Reset connection on error
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {}
      client = null;
      session = null;
    }
  }
}

// Start periodic reading
setInterval(connectAndRead, 1000);

app.get('/opcua/latest', (req, res) => {
  if (latestValue !== null) {
    res.json({ value: latestValue });
  } else {
    res.status(503).json({ error: 'No value yet' });
  }
});

app.listen(PORT, () => {
  console.log(`OPC UA Bridge listening on http://localhost:${PORT}`);
});

// Initial connection
connectAndRead();