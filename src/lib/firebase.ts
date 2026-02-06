import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBYn8Cm6HMheXYXq-mK6VrjAiuvgoaTODM",
  authDomain: "letsgokings-369ea.firebaseapp.com",
  projectId: "letsgokings-369ea",
  storageBucket: "letsgokings-369ea.firebasestorage.app",
  messagingSenderId: "488277685860",
  appId: "1:488277685860:web:78ec0ade64cc4d563e5171",
  measurementId: "G-HW520HE04S"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Optional: Add scopes for additional user info
googleProvider.addScope('profile');
googleProvider.addScope('email');
