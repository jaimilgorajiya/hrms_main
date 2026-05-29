/**
 * Firebase Authentication using firebase v9 JS SDK.
 * v9 is fully compatible with React Native + Hermes (no private class fields).
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCckjKvOFw58JILzq_2lqBv_4dSjzOWaiU',
  authDomain: 'hrms-32680.firebaseapp.com',
  projectId: 'hrms-32680',
  storageBucket: 'hrms-32680.firebasestorage.app',
  messagingSenderId: '789991408827',
  appId: '1:789991408827:ios:4851c6cd3387e812ec959e',
};

// Initialize only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with AsyncStorage persistence
let firebaseAuth;
try {
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  if (e.code === 'auth/already-initialized' || e.message?.includes('already-initialized')) {
    firebaseAuth = getAuth(app);
  } else {
    console.error('[Firebase Init] initializeAuth failed:', e);
    try {
      firebaseAuth = getAuth(app);
    } catch (getAuthErr) {
      console.error('[Firebase Init] getAuth also failed:', getAuthErr);
      throw getAuthErr;
    }
  }
}

export { firebaseAuth as auth, firebaseConfig };
