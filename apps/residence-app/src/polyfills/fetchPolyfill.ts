// Polyfill for @supabase/node-fetch to handle dynamic imports
// This file provides a fallback for the problematic dynamic import in Supabase

const fetchPolyfill = async (...args) => {
  try {
    // Try to use the native fetch first
    if (typeof globalThis !== 'undefined' && globalThis.fetch) {
      return globalThis.fetch(...args);
    }

    // Fallback to the native fetch in React Native
    if (typeof fetch !== 'undefined') {
      return fetch(...args);
    }

    // If no fetch is available, throw an error
    throw new Error('Fetch API is not available in this environment');
  } catch (error) {
    console.warn('Fetch polyfill error:', error);
    throw error;
  }
};

export default fetchPolyfill;
export const fetch = fetchPolyfill;