import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD0t30SZsM7-JSpxqp2p7S7_Stt3PDWmbM",
    authDomain: "watchcritics-bad0f.firebaseapp.com",
    projectId: "watchcritics-bad0f",
    storageBucket: "watchcritics-bad0f.firebasestorage.app",
    messagingSenderId: "67472224315",
    appId: "1:67472224315:web:69ae6857d9d6e29e51ac1e",
    measurementId: "G-XM5HRKD2QY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {auth, db}