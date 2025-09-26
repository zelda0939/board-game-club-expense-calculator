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
import transferHandlers from './transferHandlers.js';
import uiHelpers from './uiHelpers.js'; // 新增
import quickAddHandlers from './quickAddHandlers.js'; // 新增
import { analyzeReceipt } from './ai/receiptAnalyzer.js';

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
            transferMealModal: { visible: false, path: '', index: -1, sourceMemberKey: '' },
            quickAddModal: { visible: false, person: 'me', type: 'reimbursable.meal', amount: null, note: '' },
            fabMenuOpen: false, // 控制懸浮按鈕選單的開關
            isAnalyzing: false, // 新增：用於在 AI 分析時凍結畫面
            features: {
                aiAnalysisEnabled: true // 控制 AI 分析功能的開關
            }
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
        },
        'savedEntries': {
            handler(newValue) {
                const settings = getSettings();
                settings.savedEntries = newValue;
                saveSettings(settings);
            },
            deep: true
        }
    },
    computed: {
        // 由新到舊排序的已保存條目，供載入下拉選單使用
        savedEntriesDesc() {
            if (!Array.isArray(this.savedEntries)) return [];
            return [...this.savedEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
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
                return "Zelda應從Andrew獲得";
            } else {
                return "Zelda應付Andrew差額";
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
        },
        transferTargets() {
            const members = {
                me: 'Zelda',
                wife: 'Emma',
                brother: 'Andrew'
            };
            const categories = {
                reimbursable: '代墊餐費',
                our_own: '自家餐費'
            };

            const { sourceMemberKey, path } = this.transferMealModal;
            if (!path) return [];

            const targets = [];

            for (const memberKey in members) {
                if (memberKey === sourceMemberKey) continue;

                if (memberKey === 'brother') {
                    targets.push({
                        memberKey: 'brother',
                        categoryKey: 'reimbursable',
                        name: `${members.brother} (${categories.reimbursable})`
                    });
                } else {
                    for (const categoryKey in categories) {
                        targets.push({
                            memberKey: memberKey,
                            categoryKey: categoryKey,
                            name: `${members[memberKey]} (${categories[categoryKey]})`
                        });
                    }
                }
            }
            return targets;
        },
        availableExpenseTypes() {
            const person = this.quickAddModal.person;
            const types = {
                'reimbursable.meal': '代墊餐費',
                'reimbursable.transport': '代墊車費',
                'our_own.meal': '自家餐費',
                'our_own.transport': '自家車費',
            };
            if (person === 'brother') {
                types['reimbursable.printer_3d'] = '3D列印';
                delete types['our_own.meal'];
                delete types['our_own.transport'];
            }
            return types;
        },
        isMealExpense() {
            return this.quickAddModal.type.includes('meal');
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
        ...transferHandlers,
        ...uiHelpers, // 新增
        ...quickAddHandlers, // 新增
        handleDeleteMealRequest({ path, index }) {
            this.showConfirmationModal('確定要刪除此餐費項目嗎？', () => {
                this.removeMealEntry(path, index);
            });
        },
        /**
         * 處理從 ExpenseInputGroup 組件傳來的收據分析請求。
         * @param {object} payload - 包含 file 和 path 的物件。
         * @param {File} payload.file - 使用者上傳的圖片檔案。
         * @param {string} payload.path - 目標餐費列表的路徑 (例如 'reimbursable.me.meal')。
         */
        async handleReceiptAnalysis({ file, path }) {
            this.isAnalyzing = true; // 開始分析，凍結畫面
            this.showTempMessage('收據分析中，請稍候...', 'info', 0); // 顯示持續的提示訊息
            try {
                const items = await analyzeReceipt(file);
                if (items && items.length > 0) {
                    items.forEach(item => {
                        // 確保 amount 是數字且 note 是字串
                        const amount = typeof item.amount === 'number' ? item.amount : 0;
                        const note = typeof item.note === 'string' ? item.note : '';
                        this.addMealEntry(path, amount, note);
                    });
                    this.hideTempMessage(); // 先關閉「分析中」的訊息
                    this.showTempMessage(`成功新增 ${items.length} 個項目`, 'success');
                } else {
                    this.hideTempMessage(); // 先關閉「分析中」的訊息
                    this.showTempMessage('AI 未能從圖片中解析出任何項目', 'warning');
                }
            } catch (error) {
                console.error('收據分析失敗:', error);
                this.hideTempMessage(); // 先關閉「分析中」的訊息
                this.showTempMessage(`分析失敗: ${error.message}`, 'error', 5000);
            } finally {
                this.isAnalyzing = false; // 分析結束，解除凍結
                // 注意：如果分析成功或失敗時沒有手動關閉，可以在這裡統一關閉
                // this.hideTempMessage(); 
            }
        },
    },
    components: {
        CalculatorModal,
        'expense-input-group': ExpenseInputGroup // 註冊新組件
    }
});

const clickOutside = {
    beforeMount(el, binding) {
        el.clickOutsideEvent = function(event) {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        document.body.addEventListener('click', el.clickOutsideEvent);
    },
    unmounted(el) {
        document.body.removeEventListener('click', el.clickOutsideEvent);
    },
};

app.directive('click-outside', clickOutside);

app.mount('#app');