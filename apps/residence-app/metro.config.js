const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix file watching issues with problematic packages
config.watchFolders = [path.resolve(__dirname)];

// Exclude packages that cause file watching errors
config.resolver.blacklistRE = /node_modules[\/\\]@tybys[\/\\].*/;

// Add resolver configuration for better compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Ensure the alias is properly merged
if (!config.resolver.alias) {
  config.resolver.alias = {};
}
config.resolver.alias['@supabase/node-fetch'] = path.resolve(__dirname, 'src/polyfills/fetchPolyfill.ts');

// Additional configuration for polyfills
config.resolver.platforms = ['native', 'ios', 'android', 'web'];

// Configure resolver to handle dynamic imports better
config.resolver.assetExts = [...config.resolver.assetExts, 'bin', 'txt', 'jpg', 'png', 'svg', 'webp'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json'];

// Handle dynamic imports by disabling minification for problematic modules
config.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
  },
};

// Add support for transforming dynamic imports
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
    },
    output: {
      comments: false,
    },
  },
};

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