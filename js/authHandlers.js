import { createUser, signInWithEmail, signOutUser, onAuthStateChanged, auth } from './firebaseAuth.js';

// 由於這些方法會直接在 Vue 實例的 methods 中使用，它們將共享 Vue 的 this 上下文。
// 所以我們可以假設 this.showTempMessage 是可用的。

export default {
    // 顯示登入模態框
    showLoginModal() {
        this.loginModalVisible = true;
        this.loginError = ''; // 清空錯誤訊息
    },
    // 隱藏登入模態框
    cancelLoginModal() {
        this.loginModalVisible = false;
        // 如果沒有勾選記住我，則清除電子郵件，否則保留
        if (!this.rememberMe) {
            this.loginEmail = '';
        }
        this.loginPassword = '';
        this.loginError = '';
    },
    // 處理電子郵件/密碼登入
    async handleEmailSignIn() {
        try {
            this.loginError = '';
            const user = await signInWithEmail(this.loginEmail, this.loginPassword);
            if (user) {
                //this.showTempMessage("登入成功！");
                this.cancelLoginModal();
                this.user = user;
            } else {
                this.loginError = "登入失敗，請檢查您的電子郵件和密碼。";
            }
        } catch (error) {
            console.error("電子郵件登入錯誤:", error);
            this.loginError = error.message;
        }
    },
    // 處理電子郵件/密碼註冊
    async handleEmailSignUp() {
        try {
            this.loginError = '';
            const user = await createUser(this.loginEmail, this.loginPassword);
            if (user) {
                this.showTempMessage("註冊成功！您已自動登入。");
                this.cancelLoginModal();
                this.user = user;
            }
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                this.loginError = "該電子郵件已被註冊。";
            } else if (error.code === 'auth/weak-password') {
                this.loginError = "密碼強度不足，請輸入至少 6 個字元。";
            } else if (error.code === 'auth/invalid-email') {
                this.loginError = "電子郵件格式不正確。";
            } else if (error.code === 'auth/missing-password') {
                this.loginError = "請輸入密碼。";
            } else if (error.code === 'auth/network-request-failed') {
                this.loginError = "網路連線失敗，請檢查您的網路並重試。";
            } else {
                console.error("電子郵件註冊錯誤:", error);
                this.loginError = error.message; // 顯示更詳細的錯誤訊息
            }
        }
    },
    // 處理登出
    async firebaseSignOut() {
        await signOutUser();
        this.user = null;
        //this.showTempMessage("已登出。");
    },
    // 初始化 Firebase 認證狀態監聽器
    initAuthListener() {
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            if (user) {
                // 根據 rememberMe 狀態儲存或移除電子郵件
                if (this.rememberMe) {
                    localStorage.setItem('rememberedEmail', this.loginEmail);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }
                this.cancelLoginModal(); // 確保登入模態框關閉
                console.log("Vue 應用程式中：使用者已登入", user.displayName);
            } else {
                console.log("Vue 應用程式中：使用者已登出");
            }
        });
    }
};
