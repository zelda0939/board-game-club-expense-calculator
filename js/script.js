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
            savedEntries: [], // 新增用於儲存載入的數據
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
            }
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
        this.loadSavedEntries(); // 在 mounted 時載入已保存的數據，確保總是執行
    },
    watch: {
        // 監聽 reimbursable 變化，自動保存當前數據
        'reimbursable': {
            handler(newValue) {
                localStorage.setItem('familyCostCalculator', JSON.stringify({
                    reimbursable: newValue,
                    our_own: this.our_own,
                }));
            },
            deep: true,
            immediate: false
        },
        // 監聽 our_own 變化，自動保存當前數據
        'our_own': {
            handler(newValue) {
                localStorage.setItem('familyCostCalculator', JSON.stringify({
                    reimbursable: this.reimbursable,
                    our_own: newValue,
                }));
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
    },
    components: {
        CalculatorModal
    }
}).mount('#app');
