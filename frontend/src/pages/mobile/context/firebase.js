import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCckjKvOFw58JILzq_2lqBv_4dSjzOWaiU',
  authDomain: 'hrms-32680.firebaseapp.com',
  projectId: 'hrms-32680',
  storageBucket: 'hrms-32680.firebasestorage.app',
  messagingSenderId: '789991408827',
  appId: '1:789991408827:web:fbcd74d6f6e85743ec959e', // standard web config mapping if standard appId isn't available
};

// If native ios appId is used, we fall back or initialize with it
const activeConfig = {
  ...firebaseConfig,
  // Ensure we register web target app specifically
  appId: '1:789991408827:web:2f854b42b938fae1ec959e' || firebaseConfig.appId,
};

const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
const auth = getAuth(app);

export { auth, signInWithPhoneNumber, RecaptchaVerifier };
