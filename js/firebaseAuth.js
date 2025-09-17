// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 內部變數來儲存 Firebase 函數，以便在測試時可以被替換
let _signOut = signOut;
let _onAuthStateChanged = onAuthStateChanged;
let _createUserWithEmailAndPassword = createUserWithEmailAndPassword;
let _signInWithEmailAndPassword = signInWithEmailAndPassword;
let _setDoc = setDoc;
let _doc = doc;
let _getDoc = getDoc;
let _getAuth = getAuth;
let _getFirestore = getFirestore;

// 用於測試的依賴注入函數
function setFirebaseMocks(mocks) {
    _signOut = mocks.signOut || signOut;
    _onAuthStateChanged = mocks.onAuthStateChanged || onAuthStateChanged;
    _createUserWithEmailAndPassword = mocks.createUserWithEmailAndPassword || createUserWithEmailAndPassword;
    _signInWithEmailAndPassword = mocks.signInWithEmailAndPassword || signInWithEmailAndPassword;
    _setDoc = mocks.setDoc || setDoc;
    _doc = mocks.doc || doc;
    _getDoc = mocks.getDoc || getDoc;
    _getAuth = mocks.getAuth || getAuth;
    _getFirestore = mocks.getFirestore || getFirestore;
}

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyADYqsknLpKupo8ERzpNoCojihDd2xoPsU",
    authDomain: "bg-club-expense-calculator.firebaseapp.com",
    projectId: "bg-club-expense-calculator",
    storageBucket: "bg-club-expense-calculator.firebasestorage.app",
    messagingSenderId: "463266556188",
    appId: "1:463266556188:web:7968402b4b66af5d2872d9",
    measurementId: "G-PBR30YDK1S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = _getAuth(app);
const db = _getFirestore(app);

let currentUser = null; // 用於追蹤當前登入的使用者

_onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    console.log("使用者已登入:", user.displayName);
    // 在這裡可以觸發登入後的動作，例如自動備份
  } else {
    console.log("使用者已登出");
  }
});

async function signOutUser() {
  try {
    await _signOut(auth);
    console.log("登出成功");
    return true;
  } catch (error) {
    console.error("登出失敗", error);
    return false;
  }
}

async function uploadUserData(userId, data) {
  try {
    await _setDoc(_doc(db, "users", userId), {
      data: data,
      lastUpdated: new Date()
    });
    console.log("資料上傳成功");
    return true;
  } catch (error) {
    console.error("資料上傳失敗", error);
    return false;
  }
}

async function downloadUserData(userId) {
  try {
    const docRef = _doc(db, "users", userId);
    const docSnap = await _getDoc(docRef);

    if (docSnap.exists()) {
      console.log("資料下載成功:", docSnap.data());
      return docSnap.data().data;
    } else {
      console.log("雲端無此使用者資料");
      return null;
    }
  } catch (error) {
    console.error("資料下載失敗", error);
    return null;
  }
}

async function createUser(email, password) {
  try {
    const userCredential = await _createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("註冊成功", user);
    return user;
  } catch (error) {
    console.error("註冊失敗", error);
    throw error; // 重新拋出錯誤，以便上層函數可以捕獲它
  }
}

async function signInWithEmail(email, password) {
  try {
    const userCredential = await _signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("登入成功", user);
    return user;
  } catch (error) {
    console.error("登入失敗", error);
    return null;
  }
}

export {
  auth,
  currentUser,
  signOutUser,
  uploadUserData,
  downloadUserData,
  onAuthStateChanged,
  createUser,
  signInWithEmail,
  setFirebaseMocks // 導出用於測試的函數
};
