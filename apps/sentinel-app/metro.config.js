const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix file watching issues with problematic packages
config.watchFolders = [path.resolve(__dirname)];

// Exclude packages that cause file watching errors
config.resolver.blacklistRE = /node_modules[\/\\]@tybys[\/\\].*/;

// Add resolver configuration for better compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Enable network security configuration for local development
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Allow all origins for local development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key, apikey, x-client-info');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      return middleware(req, res, next);
    };
  },
};

module.exports = config;