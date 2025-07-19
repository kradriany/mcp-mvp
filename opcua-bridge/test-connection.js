const { OPCUAClient, AttributeIds } = require('node-opcua');

async function test() {
  try {
    console.log('Creating client...');
    const client = OPCUAClient.create({ endpointMustExist: false });
    
    console.log('Connecting to opc.tcp://localhost:4840...');
    await client.connect('opc.tcp://localhost:4840');
    console.log('Connected!');
    
    const session = await client.createSession();
    console.log('Session created!');
    
    const dataValue = await session.read({ 
      nodeId: 'ns=1;s=PerlinNoise', 
      attributeId: AttributeIds.Value 
    });
    
    console.log('Value:', dataValue.value.value);
    
    await session.close();
    await client.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();