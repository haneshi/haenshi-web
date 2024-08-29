// Firebase SDK 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// Firestore의 오프라인 데이터 캐싱 활성화
enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('오프라인 데이터 캐싱 설정 실패:', err);
        } else if (err.code === 'unimplemented') {
            console.log('브라우저에서 오프라인 데이터 캐싱을 지원하지 않습니다.');
        }
    });

// Firebase Authentication 및 Firestore 관련 함수 정의
export { auth, db, createUserWithEmailAndPassword, setDoc, doc, deleteDoc, serverTimestamp };