import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhiZPkQq_SbmrlrCGH3t48voUPUgi9UzE",
  authDomain: "studio-4066113562-98169.firebaseapp.com",
  projectId: "studio-4066113562-98169",
  storageBucket: "studio-4066113562-98169.firebasestorage.app",
  messagingSenderId: "319862432865",
  appId: "1:319862432865:web:fd260de65dfc339fb83620"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };