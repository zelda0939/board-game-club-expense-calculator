// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null; // 用於追蹤當前登入的使用者

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    console.log("使用者已登入:", user.displayName);
    // 在這裡可以觸發登入後的動作，例如自動備份
  } else {
    console.log("使用者已登出");
  }
});

async function firebaseSignInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("登入成功", user);
    return user;
  } catch (error) {
    console.error("登入失敗", error);
    return null;
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
    console.log("登出成功");
    return true;
  } catch (error) {
    console.error("登出失敗", error);
    return false;
  }
}

async function uploadUserData(userId, data) {
  try {
    await setDoc(doc(db, "users", userId), {
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
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("註冊成功", user);
    return user;
  } catch (error) {
    console.error("註冊失敗", error);
    return null;
  }
}

async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("登入成功", user);
    return user;
  } catch (error) {
    console.error("登入失敗", error);
    return null;
  }
}

// 無密碼登入：發送連結到電子郵件
async function sendEmailLink(email, actionCodeSettings) {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    console.log("登入連結已發送至", email);
    return true;
  } catch (error) {
    console.error("發送登入連結失敗", error);
    return false;
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
  firebaseSignInWithGoogle,
  sendEmailLink,
  isSignInWithEmailLink
};
