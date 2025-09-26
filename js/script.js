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
import screenshotHandlers from './screenshotHandlers.js'; // 新增
import aiHandlers from './aiHandlers.js'; // 導入新的 AI 處理模組
import DebugConsole from './utils/debugConsole.js';

// 定義初始數據結構 (已移至 dataPersistence.js)
// const initialData = { ... };

import { getSettings, saveSettings } from './settings.js';

// 從 URL 參數讀取除錯模式設定
const urlParams = new URLSearchParams(window.location.search);
const debugModeFromUrl = urlParams.get('debug') === 'true';

// 新增：應用程式配置
const appConfig = {
    enableDebugConsole: debugModeFromUrl // 使用 URL 參數控制除錯控制台
};

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
            customModal: { visible: false, title: '', message: '', type: 'confirm' }, // 舊的
            tempMessageModal: { visible: false, message: '', type: 'info', disappearing: true }, // 新增 disappearing 屬性
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
            features: { aiAnalysisEnabled: false }, // AI 功能預設關閉，由登入狀態控制
            screenshotOptionsModal: { visible: false } // 新增：截圖選項模態框
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
        // 根據設定初始化除錯控制台
        if (appConfig.enableDebugConsole) {
            new DebugConsole();
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
            const groupedDetails = {};
            const categoriesMap = {
                reimbursable: '代墊餐費',
                our_own: '自家餐費'
            };
            const membersMap = {
                me: 'Zelda',
                wife: 'Emma',
                brother: 'Andrew'
            };

            for (const categoryKey in categoriesMap) {
                const categoryName = categoriesMap[categoryKey];

                if (Object.hasOwnProperty.call(this, categoryKey)) {
                    const categoryData = this[categoryKey];

                    for (const memberKey in categoryData) {
                        if (Object.hasOwnProperty.call(categoryData, memberKey) && categoryData[memberKey].meal) {
                            const memberName = membersMap[memberKey];
                            let memberTotal = 0;
                            const memberMeals = [];

                            categoryData[memberKey].meal.forEach(meal => {
                                const amount = Number(String(meal.amount || 0).replace(/,/g, ''));
                                if (amount > 0) {
                                    memberTotal += amount;
                                    memberMeals.push({
                                        amount: meal.amount,
                                        note: meal.note,
                                        id: `${categoryKey}-${memberKey}-${Math.random()}`
                                    });
                                }
                            });

                            if (memberMeals.length > 0) {
                                    if (!groupedDetails[categoryName]) {
                                        groupedDetails[categoryName] = { members: {} };
                                    }
                                    if (!groupedDetails[categoryName].members[memberName]) {
                                        groupedDetails[categoryName].members[memberName] = { items: [], total: 0 };
                                    }
                                groupedDetails[categoryName].members[memberName].items = memberMeals;
                                groupedDetails[categoryName].members[memberName].total = memberTotal;
                            }
                        }
                    }
                }
            }
            return groupedDetails;
        },
        // 新增：車費明細
        allTransportDetails() {
            const groupedDetails = {
            };
            const categoriesMap = {
                reimbursable: '代墊車費',
                our_own: '自家車費'
            };
            const membersMap = {
                me: 'Zelda',
                wife: 'Emma',
                brother: 'Andrew'
            };

            // 遍歷主要類別 (reimbursable, our_own)
            for (const categoryKey in categoriesMap) {
                const categoryName = categoriesMap[categoryKey]; // 移至迴圈頂部
                let categoryTotal = 0; // 移至迴圈頂部

                if (Object.hasOwnProperty.call(this, categoryKey)) {
                    const categoryData = this[categoryKey];

                    // 遍歷該類別下的每個成員 (me, wife, brother)
                    for (const memberKey in categoryData) {
                        const transportCost = Number((categoryData[memberKey]?.transport || '0').toString().replace(/,/g, ''));
                        if (transportCost > 0) {
                            categoryTotal += transportCost;
                            if (!groupedDetails[categoryName]) {
                                groupedDetails[categoryName] = { members: {}, total: 0 };
                            }
                            groupedDetails[categoryName].members[membersMap[memberKey]] = transportCost;
                        }
                    }

                    if (groupedDetails[categoryName]) { // 確保即使分類下沒有任何項目，total 也能被正確賦值
                        groupedDetails[categoryName].total = categoryTotal;
                    }
                }
            }
            return groupedDetails;
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

            // 增加在同一個成員的 '代墊' 和 '自家' 之間轉移的選項
            const [sourceCategoryKey, sourceMember] = path.split('.');
            if (sourceMember === 'me' || sourceMember === 'wife') {
                if (sourceCategoryKey === 'reimbursable') {
                    targets.push({
                        memberKey: sourceMember,
                        categoryKey: 'our_own',
                        name: `${members[sourceMember]} (${categories.our_own})`
                    });
                } else if (sourceCategoryKey === 'our_own') {
                    targets.push({
                        memberKey: sourceMember,
                        categoryKey: 'reimbursable',
                        name: `${members[sourceMember]} (${categories.reimbursable})`
                    });
                }
            }

            // 增加轉移給其他成員的選項
            for (const memberKey in members) {
                if (memberKey === sourceMemberKey) continue;

                if (memberKey === 'brother') { // Andrew 只有代墊費用
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
            return targets.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')); // 排序讓選項更清晰
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
        ...screenshotHandlers, // 新增
        ...aiHandlers, // 導入 AI 處理方法
        handleDeleteMealRequest({ path, index }) {
            this.showConfirmationModal('確定要刪除此餐費項目嗎？', () => {
                this.removeMealEntry(path, index);
            });
        },
        handleClearMealsRequest({ path }) {
            this.showConfirmationModal('確定要清空此區塊的所有餐費項目嗎？', () => {
                const { target, key } = this.getTargetObjectAndKey(path);
                target[key] = [{ amount: 0, note: '' }]; // 重置為一個空的項目
            });
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