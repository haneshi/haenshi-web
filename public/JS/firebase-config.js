// Firebase SDK 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase 프로젝트 구성 정보
const firebaseConfig = {
    apiKey: "AIzaSyAldYIxP_QosoJ-PDjKzco0aiwpuJzn5Y8",
    authDomain: "haneshi-web.firebaseapp.com",
    projectId: "haneshi-web",
    storageBucket: "haneshi-web.appspot.com",
    messagingSenderId: "182248502409",
    appId: "1:182248502409:web:1b50232f3f1edd658a0258"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firebase Auth 초기화
const auth = getAuth(app);

// Firestore 초기화
const db = getFirestore(app);

// Firebase Authentication 및 Firestore 관련 함수 정의
export { auth, db, createUserWithEmailAndPassword, setDoc, doc };