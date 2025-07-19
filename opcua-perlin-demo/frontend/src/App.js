import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, ExternalLink, Activity, Circle, Clock, Wifi, WifiOff } from 'lucide-react';

const ConnectionViewer = () => {
  const [connections, setConnections] = useState([
    {
      id: 1,
      name: 'Perlin Noise OPC UA Server',
      type: 'opcua',
      endpoint: 'opc.tcp://localhost:4842',
      status: 'disconnected',
      lastConnected: new Date().toISOString(),
      data: []
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newConnection, setNewConnection] = useState({
    name: '',
    type: 'rest',
    endpoint: '',
    swaggerUrl: ''
  });

  // Poll OPC UA bridge for data
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/opcua/latest');
        const data = await response.json();
        
        setConnections(prev => prev.map(conn => {
          if (conn.id === 1) { // Update the Perlin noise connection
            const newData = [...conn.data];
            const now = new Date();
            
            if (response.ok && data.value !== undefined) {
              // Add new data point
              newData.push({
                time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                value: data.value
              });
              
              // Keep only last 20 data points
              if (newData.length > 20) {
                newData.shift();
              }
              
              return {
                ...conn,
                status: 'connected',
                lastConnected: data.timestamp || now.toISOString(),
                data: newData
              };
            } else {
              return {
                ...conn,
                status: 'disconnected',
                data: newData
              };
            }
          }
          return conn;
        }));
      } catch (error) {
        console.error('Failed to fetch OPC UA data:', error);
        setConnections(prev => prev.map(conn => {
          if (conn.id === 1) {
            return {
              ...conn,
              status: 'disconnected'
            };
          }
          return conn;
        }));
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      case 'stalled': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-500/20 border-green-500/50';
      case 'disconnected': return 'bg-red-500/20 border-red-500/50';
      case 'stalled': return 'bg-orange-500/20 border-orange-500/50';
      default: return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleString();
  };

  const addConnection = () => {
    if (newConnection.name && newConnection.endpoint) {
      const conn = {
        id: Date.now(),
        ...newConnection,
        status: 'disconnected',
        lastConnected: new Date().toISOString(),
        data: newConnection.type === 'opcua' ? [] : undefined
      };
      setConnections([...connections, conn]);
      setNewConnection({ name: '', type: 'rest', endpoint: '', swaggerUrl: '' });
      setShowAddForm(false);
    }
  };

  const removeConnection = (id) => {
    if (id !== 1) { // Don't allow removing the main Perlin connection
      setConnections(connections.filter(conn => conn.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              OPC UA Perlin Noise Viewer
            </h1>
            <p className="text-gray-400 mt-2">Real-time monitoring of Perlin noise data via OPC UA</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-200 transform hover:scale-105"
          >
            <Plus size={20} />
            Add Connection
          </button>
        </div>

        {/* Add Connection Form */}
        {showAddForm && (
          <div className="mb-8 bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4">Add New Connection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Connection Name"
                value={newConnection.name}
                onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <select
                value={newConnection.type}
                onChange={(e) => setNewConnection({...newConnection, type: e.target.value})}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="rest">REST API</option>
                <option value="opcua">OPC UA</option>
              </select>
              <input
                type="text"
                placeholder="Endpoint URL"
                value={newConnection.endpoint}
                onChange={(e) => setNewConnection({...newConnection, endpoint: e.target.value})}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {newConnection.type === 'rest' && (
                <input
                  type="text"
                  placeholder="Swagger URL (optional)"
                  value={newConnection.swaggerUrl}
                  onChange={(e) => setNewConnection({...newConnection, swaggerUrl: e.target.value})}
                  className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                />
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={addConnection}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Add Connection
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Connections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className={`bg-gray-800/30 backdrop-blur-lg border rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 ${getStatusBgColor(connection.status)}`}
            >
              {/* Connection Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Circle
                      size={12}
                      fill="currentColor"
                      className={getStatusColor(connection.status)}
                    />
                    <h3 className="text-xl font-semibold">{connection.name}</h3>
                  </div>
                  <p className="text-gray-400 text-sm">{connection.endpoint}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBgColor(connection.status)} border`}>
                      {connection.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {connection.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                {connection.id !== 1 && (
                  <button
                    onClick={() => removeConnection(connection.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Status Timestamp */}
              {(connection.status === 'disconnected' || connection.status === 'stalled') && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <Clock size={14} />
                  <span>Last connected: {formatTimestamp(connection.lastConnected)}</span>
                </div>
              )}

              {/* Connection Type Specific Content */}
              {connection.type === 'rest' && connection.swaggerUrl && (
                <button
                  onClick={() => window.open(connection.swaggerUrl, '_blank')}
                  className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  <ExternalLink size={16} />
                  Open Swagger Interface
                </button>
              )}

              {connection.type === 'opcua' && connection.data && connection.data.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={16} className="text-blue-400" />
                    <span className="text-sm text-gray-400">Perlin Noise Data Stream</span>
                    <span className="text-xs text-gray-500">
                      ({connection.data.length > 0 ? connection.data[connection.data.length - 1].value.toFixed(2) : 'N/A'})
                    </span>
                  </div>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={connection.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="time" 
                          stroke="#9CA3AF"
                          fontSize={10}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {connection.type === 'opcua' && connection.status === 'disconnected' && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400">
                    <WifiOff size={16} />
                    <span className="text-sm">Disconnected from OPC UA server</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Make sure the OPC UA server is running on {connection.endpoint}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {connections.length === 0 && (
          <div className="text-center py-16">
            <WifiOff size={64} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No connections configured</p>
            <p className="text-gray-500 mt-2">Add your first connection to get started</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-gray-800/20 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-400">Getting Started</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h4 className="font-medium text-white mb-2">Start OPC UA Server:</h4>
              <code className="bg-gray-900 px-2 py-1 rounded text-green-400">npm run start-server</code>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Start OPC UA Bridge:</h4>
              <code className="bg-gray-900 px-2 py-1 rounded text-green-400">npm run start-bridge</code>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            The frontend will automatically connect to the OPC UA bridge and display real-time Perlin noise data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionViewer;