import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCbFBeGc56v1fLhsWeKqmf6JK0Z6Hc-sFU',
  authDomain: 'questgen1-97446.firebaseapp.com',
  projectId: 'questgen1-97446',
  storageBucket: 'questgen1-97446.firebasestorage.app',
  messagingSenderId: '410306860774',
  appId: '1:410306860774:web:5a2bca42649137f5bd0d27',
  measurementId: 'G-PHLZMSN6E9'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
