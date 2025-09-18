/**
 * @file script.js
 * @description 這個檔案是 Vue.js 應用程式的主要入口點。
 * 它負責初始化 Vue 實例，整合所有模組化的功能（如數據持久化、計算機交互、模態框處理、餐費條目管理和計算邏輯）。
 * 此外，它還定義了應用程式的響應式數據、生命週期鉤子、監聽器、計算屬性和組件。
 */
// 引入 CalculatorModal 組件
import CalculatorModal from './CalculatorModal.js';
import ExpenseInputGroup from './components/ExpenseInputGroup.js';
import { initialData, default as dataPersistence } from './dataPersistence.js';
import calculatorAndInput from './calculatorAndInput.js';
import modalHandlers from './modalHandlers.js';
import mealEntryHelpers from './mealEntryHelpers.js';
import calculationHelpers from './calculationHelpers.js';
import firebaseHelpers from './firebaseHelpers.js';
import authHandlers from './authHandlers.js';
// 定義初始數據結構 (已移至 dataPersistence.js)
// const initialData = { ... };

import { getSettings, saveSettings } from './settings.js';

// Vue.js 應用邏輯
const {
    createApp
} = Vue;

// 新增 debounce 函數
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

const app = createApp({
    data() {
        const settings = getSettings();
        return {
            ...JSON.parse(JSON.stringify(initialData)), // 深度複製初始數據
            savedEntries: settings.savedEntries || [],
            selectedSaveEntry: '',
            loadMessage: '',
            customModal: { visible: false, title: '', message: '', type: 'confirm' },
            tempMessageModal: { visible: false, message: '' },
            pendingSaveEntry: '',
            dateChangeModal: { visible: false, originalDate: '', newDate: '' },
            overwriteConfirmModal: { visible: false, originalDate: '', newDate: '', message: '' },
            user: null,
            isSyncing: false,
            enableAutoBackup: settings.autoBackupEnabled || false,
            loginModalVisible: false,
            loginEmail: settings.rememberedEmail || '',
            loginPassword: '',
            loginError: '',
            rememberMe: !!settings.rememberedEmail,
            confirmationModal: { visible: false, message: '', onConfirm: null }, // 新增通用確認模態框狀態
        };
    },
    created() {
        this.debouncedSaveAndBackup = debounce(this.saveAndBackupData, 500);
    },
    mounted() {
        const settings = getSettings();
        const savedData = settings.currentData;
        if (savedData) {
            this.assignSavedData(this.reimbursable, savedData.reimbursable);
            this.assignSavedData(this.our_own, savedData.our_own);
        }
        this.initAuthListener();
    },
    watch: {
        'reimbursable': {
            handler() {
                this.debouncedSaveAndBackup(this);
            },
            deep: true,
            immediate: false
        },
        'our_own': {
            handler() {
                this.debouncedSaveAndBackup(this);
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
            // 1. 計算我的總支出 (代墊 + 自家)
            const myTotalExpense = this.calculateMemberTotal(this.reimbursable.me) + this.calculateMemberTotal(this.our_own.me);

            // 2. 計算Emma的總支出 (代墊 + 自家)
            const wifeTotalExpense = this.calculateMemberTotal(this.reimbursable.wife) + this.calculateMemberTotal(this.our_own.wife);

            // 3. 計算我們兩人共同的總支出，需要減去要從 Andrew 收回的錢
            const totalFamilyExpense = myTotalExpense + wifeTotalExpense - this.familyShouldReceive;

            // 4. 計算平均每人應分攤的支出
            const averageExpense = totalFamilyExpense / 2;

            // 5. Andrew 的 3D 列印費用由我和 Emma 平分
            const printer3dValue = Number(this.reimbursable.brother.printer_3d.toString().replace(/,/g, '') || 0);
            const printerCostShare = Math.floor(printer3dValue / 2);

            // 6. 計算我應給 Emma 的金額
            // (我的平均支出) - (我的實際總支出 - 從 Andrew 收回的錢) + (我應承擔的 3D 列印費用)
            const result = averageExpense - (myTotalExpense - this.familyShouldReceive) + printerCostShare;

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
        ...authHandlers,
        toggleAutoBackup() {
            this.enableAutoBackup = !this.enableAutoBackup;
            const settings = getSettings();
            settings.autoBackupEnabled = this.enableAutoBackup;
            saveSettings(settings);
            this.showTempMessage(`自動備份已${this.enableAutoBackup ? '開啟' : '關閉'}。`);
        },
        handleDeleteMealRequest({ path, index }) {
            this.showConfirmationModal('確定要刪除此餐費項目嗎？', () => {
                this.removeMealEntry(path, index);
            });
        },
    },
    components: {
        CalculatorModal,
        'expense-input-group': ExpenseInputGroup // 註冊新組件
    }
}).mount('#app');
