
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

/**
 * ELBEK DESIGN - PRODUCTION INFRASTRUCTURE FIX
 * 
 * To fix the "Infinite Loading" issue on Vercel:
 * 1. Create a file named 'cors.json':
 *    [{"origin": ["*"], "method": ["GET", "POST", "PUT", "DELETE", "HEAD"], "maxAgeSeconds": 3600}]
 * 2. Install Google Cloud SDK (gsutil).
 * 3. Run: gsutil cors set cors.json gs://darian-electronics.firebasestorage.app
 */

const firebaseConfig = {
  apiKey: "AIzaSyAGSvG6gqUz198-Y7NMLKq8dnYRmLPE7-o",
  authDomain: "darian-electronics.firebaseapp.com",
  databaseURL: "https://darian-electronics-default-rtdb.firebaseio.com",
  projectId: "darian-electronics",
  storageBucket: "darian-electronics.firebasestorage.app",
  messagingSenderId: "439635255126",
  appId: "1:439635255126:web:e666b5bde36eaaf3ac40f7",
  measurementId: "G-LXS4VHCQZ7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Critical Auth Error:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
