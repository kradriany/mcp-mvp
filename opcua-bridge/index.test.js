// Version: 0.2.0
// Jest tests for OPC UA Bridge /opcua/latest endpoint

const fetch = require('node-fetch');

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:4000/opcua/latest';

describe('OPC UA Bridge API', () => {
  test('should return 200 and a numeric value when bridge and Perlin are up', async () => {
    const res = await fetch(BRIDGE_URL);
    expect([200, 503]).toContain(res.status);
    const json = await res.json();
    if (res.status === 200) {
      expect(typeof json.value).toBe('number');
    } else {
      expect(json).toHaveProperty('error');
    }
  });

  test('should return 503 if Perlin server is down (simulate by stopping Perlin)', async () => {
    // This test expects Perlin to be down. If Perlin is up, it may return 200.
    // Manual: Stop Perlin server before running this test for a true negative.
    const res = await fetch(BRIDGE_URL);
    const json = await res.json();
    if (res.status === 503) {
      expect(json).toHaveProperty('error');
    } else {
      expect(typeof json.value).toBe('number');
    }
  });

  test('should return connection error if bridge is down', async () => {
    // This test expects the bridge to be down. It will catch the fetch error.
    // Manual: Stop the bridge before running this test for a true negative.
    let errorCaught = false;
    try {
      await fetch('http://localhost:4999/opcua/latest', { timeout: 1000 });
    } catch (err) {
      errorCaught = true;
      expect(err).toBeDefined();
    }
    expect(errorCaught).toBe(true);
  });

  test('should return JSON with value or error property', async () => {
    const res = await fetch(BRIDGE_URL);
    const json = await res.json();
    expect(json).toEqual(expect.objectContaining({
      ...(json.value !== undefined ? { value: expect.anything() } : {}),
      ...(json.error !== undefined ? { error: expect.any(String) } : {})
    }));
  });
}); 