import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

// Initialize Client SDK for settings fetching as it works better in this environment
const clientApp = initializeClientApp(firebaseConfig);
const clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

export const getAdminSettings = async () => {
  try {
    console.log('DEBUG - Fetching settings from collection: settings, doc: global using Client SDK');
    const docRef = doc(clientDb, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('DEBUG - Settings found. Keys:', Object.keys(data || {}));
      return data;
    } else {
      console.warn('DEBUG - Settings document "global" does not exist in "settings" collection.');
    }
  } catch (error) {
    console.error('Error fetching settings via Client SDK in Admin Lib:', error);
  }
  return null;
};
