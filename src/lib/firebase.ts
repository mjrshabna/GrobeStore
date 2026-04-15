import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with long polling fallback in case WebSockets are blocked
// We use experimentalForceLongPolling for maximum compatibility in restricted environments
// We also use a fallback for the database ID if the provided one is invalid
const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '' 
  ? firebaseConfig.firestoreDatabaseId 
  : '(default)';

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document from the server to test connectivity
    // We use getDocFromServer to bypass cache and force a network check
    const testDoc = doc(db, '_connection_test_', 'test');
    await getDocFromServer(testDoc);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();
    if (lowerMessage.includes('offline')) {
      console.error("Firestore connection failed: The client is offline. This usually indicates an incorrect Firebase configuration, that the database is not yet provisioned, or that network conditions are preventing a connection.");
      
      // If the named database failed, we can't easily switch at runtime without re-initializing,
      // but we log it clearly for the developer.
    } else if (lowerMessage.includes('permission-denied') || lowerMessage.includes('insufficient permissions')) {
      // Permission denied is actually a good sign - it means we reached the server!
      console.log("Firestore connection verified (reached server)");
    } else {
      console.warn("Firestore connection test produced an unexpected result:", errorMessage);
    }
  }
}

testConnection();
