const { OPCUAClient, AttributeIds } = require('node-opcua');

async function browse() {
  const client = OPCUAClient.create({ endpointMustExist: false });
  
  try {
    await client.connect('opc.tcp://localhost:4840');
    console.log('Connected!');
    
    const session = await client.createSession();
    console.log('Session created!');
    
    // Browse from root
    console.log('\nBrowsing Objects folder...');
    const browseResult = await session.browse("RootFolder");
    
    for (const reference of browseResult.references) {
      console.log(`  -> ${reference.browseName.toString()}`);
    }
    
    // Browse Objects folder
    const objectsResult = await session.browse("ObjectsFolder");
    console.log('\nBrowsing inside Objects folder...');
    
    for (const reference of objectsResult.references) {
      console.log(`  -> ${reference.browseName.toString()} (NodeId: ${reference.nodeId.toString()})`);
      
      // If this is the PerlinNoiseGenerator, browse it
      if (reference.browseName.name === "PerlinNoiseGenerator") {
        console.log('\n  Browsing PerlinNoiseGenerator:');
        const perlinResult = await session.browse(reference.nodeId);
        
        for (const child of perlinResult.references) {
          console.log(`    -> ${child.browseName.toString()} (NodeId: ${child.nodeId.toString()})`);
          
          // Try to read the value if it's PerlinNoise
          if (child.browseName.name === "PerlinNoise") {
            const dataValue = await session.read({
              nodeId: child.nodeId.toString(),
              attributeId: AttributeIds.Value
            });
            console.log(`       Value: ${dataValue.value.value}`);
          }
        }
      }
    }
    
    await session.close();
    await client.disconnect();
    console.log('\nDisconnected');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

browse();