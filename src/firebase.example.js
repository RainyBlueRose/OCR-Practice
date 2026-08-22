// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_CONFIG",
  authDomain: "YOUR_CONFIG",
  projectId: "YOUR_CONFIG",
  storageBucket: "YOUR_CONFIG",
  messagingSenderId: "YOUR_CONFIG",
  appId: "YOUR_CONFIG",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app)
export default app;
