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
            return [...this.savedEntries].slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
        handleDeleteMealRequest({ path, index }) {
            this.showConfirmationModal('確定要刪除此餐費項目嗎？', () => {
                this.removeMealEntry(path, index);
            });
        },
        openQuickAddModal() {
            this.quickAddModal.visible = true;
            this.quickAddModal.person = 'me';
            this.quickAddModal.type = 'reimbursable.meal';
            this.quickAddModal.amount = null;
            this.quickAddModal.note = '';
        },
        closeQuickAddModal() {
            this.quickAddModal.visible = false;
        },
        saveQuickExpense() {
            const { person, type, amount, note } = this.quickAddModal;
            const numericAmount = parseFloat(String(amount).replace(/,/g, '')) || 0;

            if (!numericAmount || numericAmount <= 0) {
                this.showTempMessage('請輸入有效的金額', 'error');
                return;
            }

            const [category, expenseType] = type.split('.');
            
            if (expenseType === 'meal') {
                const path = `${category}.${person}.meal`;
                this.addMealEntry(path, numericAmount, note);
                // 等待 DOM 更新，然後滾動並聚焦到新加入的餐費項目
                this.$nextTick(() => {
                    try {
                        const refName = `group-${person}`;
                        const groupComp = this.$refs && this.$refs[refName];
                        let handledByRef = false;
                        if (groupComp && typeof groupComp.scrollToLatestMeal === 'function') {
                            try {
                                handledByRef = !!groupComp.scrollToLatestMeal(path);
                                console.debug('scrollToLatestMeal via ref returned', handledByRef);
                            } catch (e) {
                                console.error('error calling scrollToLatestMeal on ref', e);
                            }
                        }

                        if (!handledByRef) {
                            // fallback to DOM-based search (previous logic)
                            let newEntry = null;
                            const wrapper = document.querySelector(`.meal-entries[data-member-path="${path}"]`);
                            if (wrapper) {
                                const entries = wrapper.querySelectorAll('.meal-entry');
                                if (entries && entries.length > 0) newEntry = entries[entries.length - 1];
                            }

                            if (!newEntry) {
                                const memberEl = document.querySelector(`.card[data-member-key="${person}"]`);
                                if (memberEl) {
                                    const mealEntries = memberEl.querySelectorAll('.meal-entries .meal-entry');
                                    if (mealEntries && mealEntries.length > 0) {
                                        newEntry = mealEntries[mealEntries.length - 1];
                                    }
                                }
                            }

                            if (newEntry) {
                                console.debug('Found newEntry for quick add (DOM fallback):', newEntry);
                                newEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setTimeout(() => {
                                    try {
                                        const rect = newEntry.getBoundingClientRect();
                                        const absoluteTop = rect.top + window.pageYOffset - (window.innerHeight / 2);
                                        window.scrollTo({ top: absoluteTop, behavior: 'smooth' });
                                    } catch (e) {}
                                }, 120);
                            } else {
                                console.debug('Could not find newEntry for quick add (DOM fallback)');
                            }
                        }
                    } catch (e) {
                        console.error('scrollToNewMealEntry error', e);
                    }
                });
            } else {
                this[category][person][expenseType] = numericAmount;
                // 如果是非 meal 類型（例如 transport 或 printer_3d），嘗試滾動並聚焦該欄位
                const path = `${category}.${person}.${expenseType}`;
                this.$nextTick(() => {
                    try {
                        const refName = `group-${person}`;
                        const groupComp = this.$refs && this.$refs[refName];
                        let handled = false;
                        if (groupComp && typeof groupComp.scrollToPath === 'function') {
                            try {
                                handled = !!groupComp.scrollToPath(path);
                                console.debug('scrollToPath via ref returned', handled);
                            } catch (e) {
                                console.error('error calling scrollToPath on ref', e);
                            }
                        }

                        if (!handled) {
                            // DOM fallback: 找 input[data-member-path="path"]
                            const el = document.querySelector(`[data-member-path="${path}"]`);
                            if (el) {
                                // 找最近可滾動容器
                                function findScrollContainer(elm) {
                                    let cur = elm.parentElement;
                                    while (cur) {
                                        const style = window.getComputedStyle(cur);
                                        const overflowY = style.overflowY;
                                        const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight;
                                        if (isScrollable) return cur;
                                        cur = cur.parentElement;
                                    }
                                    return null;
                                }

                                const scrollContainer = findScrollContainer(el);
                                if (scrollContainer) {
                                    const containerRect = scrollContainer.getBoundingClientRect();
                                    const entryRect = el.getBoundingClientRect();
                                    const offset = (entryRect.top - containerRect.top) + (entryRect.height / 2) - (containerRect.height / 2);
                                    const targetScroll = Math.max(0, scrollContainer.scrollTop + offset);
                                    try {
                                        scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
                                    } catch (e) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                } else {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }

                                setTimeout(() => {
                                    try {
                                        const rect = el.getBoundingClientRect();
                                        const absoluteTop = rect.top + window.pageYOffset - (window.innerHeight / 2);
                                        window.scrollTo({ top: absoluteTop, behavior: 'smooth' });
                                    } catch (e) {}
                                }, 120);
                            } else {
                                console.debug('Could not find element for path', path);
                            }
                        }
                    } catch (e) {
                        console.error('scrollToPath quick add error', e);
                    }
                });
            }

            this.showTempMessage('費用已新增', 'success');
            this.closeQuickAddModal();
        },
        openQuickAddCalculator() {
            this.calculatorState.targetPath = 'quickAddModal.amount';
            const currentValue = this.quickAddModal.amount;
            this.calculatorState.initialValue = (currentValue !== undefined && currentValue !== null) ? currentValue.toString().replace(/,/g, '') : '';
            this.calculatorState.visible = true;
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