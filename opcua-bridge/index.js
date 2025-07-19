const express = require('express');
const cors = require('cors');
const { OPCUAClient, AttributeIds } = require('node-opcua');

const app = express();
app.use(cors());
const PORT = 4000;

// OPC UA connection config
const endpointUrl = 'opc.tcp://localhost:4840';
const nodeId = 'ns=1;s=PerlinNoise'; // Adjust to match your Perlin server node

let latestValue = null;

async function connectOPCUA() {
  try {
    const client = OPCUAClient.create({ endpointMustExist: false });
    await client.connect(endpointUrl);
    const session = await client.createSession();
    console.log('Connected to OPC UA server');

    // Monitor the node for value changes
    setInterval(async () => {
      try {
        const dataValue = await session.read({ nodeId, attributeId: AttributeIds.Value });
        latestValue = dataValue.value.value;
        console.log('Read value:', latestValue);
      } catch (err) {
        console.error('Error reading OPC UA node:', err.message);
      }
    }, 1000);
  } catch (err) {
    console.error('Failed to connect to OPC UA server:', err.message);
  }
}

connectOPCUA();

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