import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-tW_HJ7AhpmOBaPp2AosYUbETNy32BTg",
  authDomain: "jpcpublicservice.firebaseapp.com",
  databaseURL: "https://jpcpublicservice-default-rtdb.firebaseio.com",
  projectId: "jpcpublicservice",
  storageBucket: "jpcpublicservice.firebasestorage.app",
  messagingSenderId: "206294816480",
  appId: "1:206294816480:web:2895a58d28b7a9f08ce285",
  measurementId: "G-6ZLC0WYPQZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
