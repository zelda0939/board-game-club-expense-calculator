/**
 * @file script.js
 * @description 這個檔案是 Vue.js 應用程式的主要入口點。
 * 它負責初始化 Vue 實例，整合所有模組化的功能（如數據持久化、計算機交互、模態框處理、餐費條目管理和計算邏輯）。
 * 此外，它還定義了應用程式的響應式數據、生命週期鉤子、監聽器、計算屬性和組件。
 */
// 引入 CalculatorModal 組件
import CalculatorModal from './CalculatorModal.js';
import { initialData, default as dataPersistence } from './dataPersistence.js';
import calculatorAndInput from './calculatorAndInput.js';
import modalHandlers from './modalHandlers.js';
import mealEntryHelpers from './mealEntryHelpers.js';
import calculationHelpers from './calculationHelpers.js';
import { onAuthStateChanged, createUser, signInWithEmail, firebaseSignInWithGoogle, signOutUser, sendEmailLink, isSignInWithEmailLink } from './firebaseAuth.js';
import { auth } from './firebaseAuth.js';
import { signInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import firebaseHelpers from './firebaseHelpers.js';
// 定義初始數據結構 (已移至 dataPersistence.js)
// const initialData = { ... };

// Vue.js 應用邏輯
const {
    createApp
} = Vue;

const app = createApp({
    data() {
        return {
            ...JSON.parse(JSON.stringify(initialData)), // 深度複製初始數據
            savedEntries: JSON.parse(localStorage.getItem('familyCostCalculatorSavedEntries') || '[]'), // 新增用於儲存載入的數據，從 localStorage 載入
            selectedSaveEntry: '', // 新增用於選擇載入的數據
            loadMessage: '', // 新增用於顯示載入/保存提示訊息
            customModal: { // 新增自定義模態框狀態
                visible: false,
                title: '',
                message: '',
                type: 'confirm' // 'confirm' 或 'info'
            },
            tempMessageModal: { // 新增短暫提示訊息模態框狀態
                visible: false,
                message: ''
            },
            pendingSaveEntry: '', // 新增用於暫存載入/刪除選擇的日期
            dateChangeModal: { // 新增變更日期模態框狀態
                visible: false,
                originalDate: '',
                newDate: ''
            },
            overwriteConfirmModal: { // 新增覆蓋確認模態框狀態
                visible: false,
                originalDate: '',
                newDate: '',
                message: ''
            },
            user: null, // 新增使用者狀態
            isSyncing: false, // 標誌是否正在同步數據
            enableAutoBackup: localStorage.getItem('autoBackupEnabled') === 'true', // 新增自動備份開關，從 localStorage 載入，預設為關閉
            loginModalVisible: false, // 控制登入模態框的顯示
            loginEmail: '', // 綁定電子郵件輸入
            loginPassword: '', // 綁定密碼輸入
            loginError: '', // 登入錯誤訊息
            actionCodeSettings: {
                url: window.location.href, // 當前頁面作為重定向 URL
                handleCodeInApp: true, // 必須為 true
            },
        };
    },
    mounted() {
        const savedData = localStorage.getItem('familyCostCalculator');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            // 使用新的 assignSavedData 方法來處理載入的數據
            this.assignSavedData(this.reimbursable, parsedData.reimbursable);
            this.assignSavedData(this.our_own, parsedData.our_own);
        }
        // 移除 mounted 時的 loadSavedEntries 呼叫，因為已在 data() 中初始化
        // this.loadSavedEntries(); // 在 mounted 時載入已保存的數據，確保總是執行

        // 監聽 Firebase 認證狀態變化
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            if (user) {
                console.log("Vue 應用程式中：使用者已登入", user.displayName);
                // 登入後觸發一次完整備份
                // this.backupToCloud(); // 根據使用者要求，取消登入後自動備份
            } else {
                console.log("Vue 應用程式中：使用者已登出");
            }
        });

        // 處理電子郵件連結登入 (無密碼登入)
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                // 如果沒有 email，可能是使用者直接點擊連結，需要讓他們輸入 email
                email = prompt('請輸入您的電子郵件以完成登入：');
            }
            if (email) {
                signInWithEmailLink(auth, email, window.location.href)
                    .then((result) => {
                        console.log("無密碼登入成功", result.user);
                        this.showTempMessage("無密碼登入成功！");
                        window.localStorage.removeItem('emailForSignIn');
                        this.user = result.user;
                    })
                    .catch((error) => {
                        console.error("無密碼登入失敗", error);
                        this.loginError = error.message;
                        this.showTempMessage("無密碼登入失敗，請重試。", 'error');
                    });
            } else {
                this.loginError = "請提供電子郵件以完成無密碼登入。";
                this.showTempMessage("無密碼登入失敗：請提供電子郵件。", 'error');
            }
        }
    },
    watch: {
        // 監聽 reimbursable 變化，自動保存當前數據
        'reimbursable': {
            handler(newValue, oldValue) {
                localStorage.setItem('familyCostCalculator', JSON.stringify({
                    reimbursable: newValue,
                    our_own: this.our_own,
                }));
                if (this.user && !this.isSyncing && this.enableAutoBackup) {
                    this.backupToCloud(true);
                }
            },
            deep: true,
            immediate: false
        },
        // 監聽 our_own 變化，自動保存當前數據
        'our_own': {
            handler(newValue, oldValue) {
                localStorage.setItem('familyCostCalculator', JSON.stringify({
                    reimbursable: this.reimbursable,
                    our_own: newValue,
                }));
                if (this.user && !this.isSyncing && this.enableAutoBackup) {
                    this.backupToCloud(true);
                }
            },
            deep: true,
            immediate: false
        }
    },
    computed: {
        // 我們家應獲得差額
        familyShouldReceive() {
            const myTotal = this.calculateMemberTotal(this.reimbursable.me);
            const wifeTotal = this.calculateMemberTotal(this.reimbursable.wife);
            const brotherTotal = this.calculateMemberTotal(this.reimbursable.brother);
            const result = myTotal + wifeTotal - brotherTotal;
            return Math.round(result);
        },
        // 我應再給Emma
        amountToGiveWife() {
            // 1. 計算我的總支出
            const myTotalOwnExpense = this.calculateMemberTotal(this.reimbursable.me) + this.calculateMemberTotal(this.our_own.me);
            // 2. 計算Emma的總支出
            const wifeTotalOwnExpense = this.calculateMemberTotal(this.reimbursable.wife) + this.calculateMemberTotal(this.our_own.wife);
            // 3. 計算夫妻兩人總支出
            const totalFamilyExpense = myTotalOwnExpense + wifeTotalOwnExpense - this.familyShouldReceive;
            // 4. 計算平均每人應支出
            const averageExpense = totalFamilyExpense / 2;
            // 5. 計算我應給Emma的金額 (平均值 - 我的實際支出)
            const printer3dValue = Number(this.reimbursable.brother.printer_3d.toString().replace(/,/g, '') || 0);
            const result = averageExpense - (myTotalOwnExpense - this.familyShouldReceive) + (Math.floor(printer3dValue / 2));
            return Math.round(result);
        },
        // 動態變更標題文字
        amountToGiveWifeText() {
            if (this.amountToGiveWife >= 0) {
                return "Zelda應再給Emma";
            } else {
                return "Emma應再給Zelda";
            }
        },
        // 動態變更我們家應獲得差額的標題文字
        familyShouldReceiveText() {
            if (this.familyShouldReceive >= 0) {
                return "我們家應獲得差額";
            } else {
                return "我們家應付出差額";
            }
        },
        // 餐費明細
        allMealDetails() {
            const details = [];

            // 定義類別名稱的映射
            const categoriesMap = {
                reimbursable: '代墊餐費',
                our_own: '自家餐費'
            };

            // 定義成員名稱的映射
            const membersMap = {
                me: 'Zelda',
                wife: 'Emma',
                brother: 'Andrew'
            };

            // 遍歷主要類別 (reimbursable, our_own)
            for (const categoryKey in categoriesMap) {
                if (Object.hasOwnProperty.call(this, categoryKey)) {
                    const categoryName = categoriesMap[categoryKey];
                    const categoryData = this[categoryKey]; // 取得該類別下的所有成員資料

                    // 遍歷該類別下的每個成員 (me, wife, brother)
                    for (const memberKey in categoryData) {
                        if (Object.hasOwnProperty.call(categoryData, memberKey) && categoryData[memberKey].meal) {
                            const memberName = membersMap[memberKey];
                            // 遍歷該成員的餐費陣列
                            categoryData[memberKey].meal.forEach(meal => {
                                if (Number(meal.amount.toString().replace(/,/g, '')) > 0) { // 只顯示金額大於0的項目
                                    details.push({
                                        category: categoryName,
                                        member: memberName,
                                        amount: meal.amount,
                                        note: meal.note
                                    });
                                }
                            });
                        }
                    }
                }
            }
            return details;
        }
    },
    methods: {
        ...dataPersistence,
        ...calculatorAndInput,
        ...modalHandlers,
        ...mealEntryHelpers,
        ...calculationHelpers,
        ...firebaseHelpers,
        // 顯示登入模態框
        showLoginModal() {
            this.loginModalVisible = true;
            this.loginError = ''; // 清空錯誤訊息
        },
        // 隱藏登入模態框
        cancelLoginModal() {
            this.loginModalVisible = false;
            this.loginEmail = '';
            this.loginPassword = '';
            this.loginError = '';
        },
        // 處理電子郵件/密碼登入
        async handleEmailSignIn() {
            try {
                this.loginError = '';
                const user = await signInWithEmail(this.loginEmail, this.loginPassword);
                if (user) {
                    this.showTempMessage("登入成功！");
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
                } else {
                    this.loginError = "註冊失敗，請重試。";
                }
            } catch (error) {
                console.error("電子郵件註冊錯誤:", error);
                this.loginError = error.message;
            }
        },
        // 處理 Google 登入
        async signInWithGoogle() {
            try {
                this.loginError = '';
                const user = await firebaseSignInWithGoogle(); // 呼叫匯出的 Google 登入函式
                if (user) {
                    this.showTempMessage("Google 登入成功！");
                    this.cancelLoginModal();
                    this.user = user;
                } else {
                    this.loginError = "Google 登入失敗。";
                }
            } catch (error) {
                console.error("Google 登入錯誤:", error);
                this.loginError = error.message;
            }
        },
        // 處理登出
        async firebaseSignOut() {
            await signOutUser();
            this.user = null;
            this.showTempMessage("已登出。");
        },
        // 處理無密碼登入 (發送連結)
        async handlePasswordlessSignIn() {
            try {
                this.loginError = '';
                if (!this.loginEmail) {
                    this.loginError = "請輸入您的電子郵件以發送登入連結。";
                    return;
                }
                // 將 email 儲存在 localStorage，以便在連結跳轉後使用
                window.localStorage.setItem('emailForSignIn', this.loginEmail);
                const success = await sendEmailLink(this.loginEmail, this.actionCodeSettings);
                if (success) {
                    this.showTempMessage("登入連結已發送至您的電子郵件！請檢查收件箱。", 'info', 5000);
                    this.cancelLoginModal();
                } else {
                    this.loginError = "發送登入連結失敗，請檢查電子郵件地址。";
                }
            } catch (error) {
                console.error("發送登入連結錯誤:", error);
                this.loginError = error.message;
            }
        }
    },
    components: {
        CalculatorModal
    }
}).mount('#app');
