const { OPCUAServer, Variant, DataType, UAVariable, StatusCodes } = require('node-opcua');
const PerlinNoise = require('./perlin');

const port = 4842;
const endpointUrl = `opc.tcp://localhost:${port}`;

// Initialize Perlin noise generator
const perlin = new PerlinNoise(42); // Use seed for reproducible results
let time = 0;

async function main() {
  // Create the OPC UA Server
  const server = new OPCUAServer({
    port: port,
    resourcePath: '/UA/Server',
    buildInfo: {
      productName: 'Perlin Noise OPC UA Server',
      buildNumber: '1.0.0',
      buildDate: new Date()
    }
  });

  await server.initialize();

  const addressSpace = server.engine.addressSpace;
  const namespace = addressSpace.getOwnNamespace();

  // Create a folder for our variables
  const perlinFolder = namespace.addFolder('ObjectsFolder', {
    browseName: 'PerlinNoise',
    displayName: 'Perlin Noise Data'
  });

  // Create the Perlin noise variable
  const perlinVariable = namespace.addVariable({
    componentOf: perlinFolder,
    browseName: 'PerlinValue',
    displayName: 'Perlin Noise Value',
    dataType: DataType.Double,
    value: {
      get: () => {
        // Generate Perlin noise value that changes over time
        const noiseValue = perlin.noise(time * 0.1, 0, 0) * 50 + 50; // Scale to 0-100 range
        console.log(`Perlin Noise Value: ${noiseValue.toFixed(4)}`);
        return new Variant({ dataType: DataType.Double, value: noiseValue });
      }
    }
  });

  // Update time periodically
  setInterval(() => {
    time += 0.1;
  }, 1000); // Update every second

  console.log('Starting OPC UA Server...');
  await server.start();
  
  console.log(`OPC UA Server is now listening on ${endpointUrl}`);
  console.log('NodeId: ns=1;s=PerlinValue');
  console.log('Press Ctrl+C to stop');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down OPC UA Server...');
    await server.shutdown();
    process.exit(0);
  });
}

main().catch(console.error);