/**
 * @file ExpenseInputGroup.js
 * @description 一個 Vue 組件，用於顯示和管理單個成員的費用輸入。
 */

import { scrollToElement } from '../utils/scrollUtils.js';

export default {
    props: {
        title: String, // 成員標題，例如 "Zelda"
        memberKey: String, // 成員在數據結構中的鍵，例如 "me"
        reimbursableMeal: Array,
        reimbursableTransport: Number,
        ownMeal: Array,
        ownTransport: Number,
        isBrother: { // 特殊標記，用於決定是否顯示 3D 列印選項
            type: Boolean,
            default: false
        },
        brotherPrinter3d: Number,
        aiAnalysisEnabled: { // 新增 prop 來接收 AI 功能開關狀態
            type: Boolean,
            default: false
        }
    },
    emits: [
        'open-calculator',
        'open-calculator-for-meal',
        'add-meal-entry',
        'remove-meal-entry',
        'update:reimbursableMeal',
        'update:reimbursableTransport',
        'update:ownMeal',
        'update:ownTransport',
        'update:brotherPrinter3d',
        'request-delete-confirmation', // 新增事件
        'request-transfer-meal',
        'analyze-receipt', // 新增 AI 分析事件
        'request-clear-meals' // 新增清空餐費事件
    ],
    data() {
        return {
            activeMealMenu: null, // e.g., { path: 'reimbursable.me.meal', index: 0 }
        };
    },
    computed: {
        totalReimbursableMeal() {
            if (!this.reimbursableMeal) return 0;
            return this.reimbursableMeal.reduce((total, meal) => total + this._parseAmount(meal.amount), 0);
        },
        totalOwnMeal() {
            if (!this.ownMeal) return 0;
            return this.ownMeal.reduce((total, meal) => total + this._parseAmount(meal.amount), 0);
        },
        formatCurrency() {
            return (value) => {
                if (typeof value !== 'number') {
                    return '0';
                }
                return value.toLocaleString();
            }
        }
    },
    methods: {
        _parseAmount(amount) {
            return parseFloat(String(amount || 0).replace(/,/g, ''));
        },
        // 為了讓模板中的事件能夠正確觸發，我們需要這些方法來轉發事件到父組件
        openCalculator(path) {
            this.$emit('open-calculator', path);
        },
        openCalculatorForMeal(path, index) {
            this.$emit('open-calculator-for-meal', path, index);
        },
        addMealEntry(path) {
            this.$emit('add-meal-entry', path);
        },
        removeMealEntry(path, index) {
            // 直接發出請求，讓父組件處理確認模態框
            this.$emit('request-delete-confirmation', { path, index });
            this.activeMealMenu = null;
        },
        // 觸發隱藏的檔案上傳 input
        triggerFileUpload(path) {
            // 使用 ref 找到對應的 input 並觸發點擊
            const inputRef = `fileInput_${path.replace(/\./g, '_')}`;
            this.$refs[inputRef]?.click();
        },
        // 處理檔案選擇
        handleFileChange(event, path) {
            const file = event.target.files[0];
            if (file) {
                this.$emit('analyze-receipt', { file, path });
            }
            event.target.value = ''; // 重置 input 以便可以再次上傳同一個檔案
        },
        // 處理一般金額的顯示
        getFieldValue(value) {
            if (value === null || value === undefined || value === '') return '0';
            const sValue = value.toString();
            const num = Number(sValue.replace(/,/g, ''));
            return isNaN(num) ? sValue : num.toLocaleString();
        },
        // 更新餐費備註
        updateMealNote(mealArray, index, event) {
            const newMealArray = [...mealArray];
            newMealArray[index] = { ...newMealArray[index], note: event.target.value };
            if (this.reimbursableMeal === mealArray) {
                this.$emit('update:reimbursableMeal', newMealArray);
            } else if (this.ownMeal === mealArray) {
                this.$emit('update:ownMeal', newMealArray);
            }
        },
        requestTransferMeal(path, index) {
            this.$emit('request-transfer-meal', { path, index });
            this.activeMealMenu = null;
        },
        toggleMealMenu(path, index) {
            const menuKey = `${path}-${index}`;
            if (this.activeMealMenu === menuKey) {
                this.activeMealMenu = null; // Close if already open
            } else {
                this.activeMealMenu = menuKey; // Open it
            }
        },
        isMenuActive(path, index) {
            return this.activeMealMenu === `${path}-${index}`;
        },
        closeMenuIfActive(path, index) {
            if (this.isMenuActive(path, index)) {
                this.activeMealMenu = null;
            }
        },
        canClearMeals(mealArray) {
            if (!mealArray || mealArray.length === 0) return false;
            if (mealArray.length > 1) return true;
            const singleEntry = mealArray[0];
            // 檢查金額是否大於0或備註不為空
            return this._parseAmount(singleEntry.amount) > 0 || singleEntry.note !== '';
        },
        requestClearMeals(path) {
            this.$emit('request-clear-meals', { path });
        },
        // 父元件可以呼叫此方法 (透過 $refs) 來讓組件滾動並聚焦到最新加入的餐費項目
        scrollToLatestMeal(path) {
            try {
                const mealWrapper = this.$el.querySelector(`.meal-entries[data-member-path="${path}"]`);
                if (!mealWrapper) return false;

                const entries = mealWrapper.querySelectorAll('.meal-entry');
                if (entries.length > 0) {
                    const lastEntry = entries[entries.length - 1];
                    scrollToElement(lastEntry);
                    return true;
                }
                return false;
            } catch (e) {
                console.error('ExpenseInputGroup.scrollToLatestMeal error', e);
                return false;
            }
        },
        // 通用的滾動方法：父元件可呼叫此方法，傳入任意 path（如 'reimbursable.me.meal' 或 'reimbursable.me.transport'）
        scrollToPath(path) {
            try {
                // 1) 嘗試以 meal-entries container 處理（若是 meal）
                const mealWrapper = this.$el.querySelector(`.meal-entries[data-member-path="${path}"]`);
                if (mealWrapper) {
                    const entries = mealWrapper.querySelectorAll('.meal-entry');
                    const targetElement = entries.length > 0 ? entries[entries.length - 1] : mealWrapper;
                    scrollToElement(targetElement);
                    return true;
                }

                // 2) 嘗試以具體 input[data-member-path] 處理（transport, printer_3d 等）
                const field = this.$el.querySelector(`[data-member-path="${path}"]`);
                if (field) {
                    scrollToElement(field);
                    return true;
                }

                return false;
            } catch (e) {
                console.error('ExpenseInputGroup.scrollToPath error', e);
                return false;
            }
        }
    },
    template: `
    <div class="card" :data-member-key="memberKey">
            <h2>{{ title }}</h2>
            <!-- 代墊費用 -->
            <div class="input-group">
                <label>代墊餐費</label>
                <div class="input-wrapper meal-entries" :data-member-path="'reimbursable.' + memberKey + '.meal'">
                    <div v-for="(meal, index) in reimbursableMeal" :key="index" class="meal-entry" :data-index="index">
                        <input type="text"
                               :value="getFieldValue(reimbursableMeal[index]?.amount)"
                               @focus="openCalculatorForMeal('reimbursable.' + memberKey + '.meal', index)"
                               placeholder="0" readonly>
                        <input type="text"
                               :value="meal.note"
                               @input="updateMealNote(reimbursableMeal, index, $event)"
                               placeholder="備註">
                        <div class="meal-actions" v-click-outside="() => closeMenuIfActive('reimbursable.' + memberKey + '.meal', index)">
                            <!-- 只有在項目超過一個時才顯示操作選單按鈕 -->
                            <template v-if="reimbursableMeal.length > 1">
                                <button @click="toggleMealMenu('reimbursable.' + memberKey + '.meal', index)" class="actions-btn"><i class="fa-solid fa-ellipsis-v"></i></button>
                                <transition name="fade-scale">
                                    <div v-if="isMenuActive('reimbursable.' + memberKey + '.meal', index)" class="actions-menu">
                                        <button @click="requestTransferMeal('reimbursable.' + memberKey + '.meal', index)" class="transfer-meal-btn"><i class="fa-solid fa-right-left"></i></button>
                                        <button @click="removeMealEntry('reimbursable.' + memberKey + '.meal', index)" class="remove-meal-btn"><i class="fa-solid fa-trash-can"></i></button>
                                    </div>
                                </transition>
                            </template>
                        </div>
                    </div>
                    <div class="meal-total" v-if="reimbursableMeal && reimbursableMeal.length > 1 && totalReimbursableMeal > 0">
                        <strong>總計：</strong> {{ formatCurrency(totalReimbursableMeal) }}
                    </div>
                    <div class="meal-entry-actions">
                        <button @click="addMealEntry('reimbursable.' + memberKey + '.meal')" class="add-meal-btn"><i class="fa-solid fa-plus"></i> 新增餐費</button>
                        <div class="action-buttons-group">
                            <button v-if="aiAnalysisEnabled" @click="triggerFileUpload('reimbursable.' + memberKey + '.meal')" class="ai-receipt-btn" title="AI 收據分析"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                            <button v-if="canClearMeals(reimbursableMeal)" @click="requestClearMeals('reimbursable.' + memberKey + '.meal')" class="clear-meals-btn" title="清空此區餐費"><i class="fa-solid fa-broom"></i></button>
                            <input type="file" :ref="'fileInput_reimbursable_' + memberKey + '_meal'" @change="handleFileChange($event, 'reimbursable.' + memberKey + '.meal')" accept="image/*" style="display: none;">
                        </div>
                    </div>
                </div>
            </div>
            <div class="input-group">
                <label>代墊車費</label>
                <div class="input-row">
                    <div class="input-wrapper">
                        <input type="text" :value="getFieldValue(reimbursableTransport)" @focus="openCalculator('reimbursable.' + memberKey + '.transport')" :data-member-path="'reimbursable.' + memberKey + '.transport'" placeholder="0" readonly>
                    </div>
                </div>
            </div>

            <!-- 自家花費 (如果不是 Andrew) -->
            <template v-if="!isBrother">
                <div class="input-group">
                    <label>自家餐費</label>
                    <div class="input-wrapper meal-entries" :data-member-path="'our_own.' + memberKey + '.meal'">
                        <div v-for="(meal, index) in ownMeal" :key="index" class="meal-entry" :data-index="index">
                            <input type="text"
                                   :value="getFieldValue(ownMeal[index]?.amount)"
                                   @focus="openCalculatorForMeal('our_own.' + memberKey + '.meal', index)"
                                   placeholder="0" readonly>
                            <input type="text"
                                   :value="meal.note"
                                   @input="updateMealNote(ownMeal, index, $event)"
                                   placeholder="備註">
                            <div class="meal-actions" v-click-outside="() => closeMenuIfActive('our_own.' + memberKey + '.meal', index)">
                                <!-- 只有在項目超過一個時才顯示操作選單按鈕 -->
                                <template v-if="ownMeal.length > 1">
                                    <button @click="toggleMealMenu('our_own.' + memberKey + '.meal', index)" class="actions-btn"><i class="fa-solid fa-ellipsis-v"></i></button>
                                    <transition name="fade-scale">
                                        <div v-if="isMenuActive('our_own.' + memberKey + '.meal', index)" class="actions-menu">
                                            <button @click="requestTransferMeal('our_own.' + memberKey + '.meal', index)" class="transfer-meal-btn"><i class="fa-solid fa-right-left"></i></button>
                                            <button @click="removeMealEntry('our_own.' + memberKey + '.meal', index)" class="remove-meal-btn"><i class="fa-solid fa-trash-can"></i></button>
                                        </div>
                                    </transition>
                                </template>
                            </div>
                        </div>
                        <div class="meal-total" v-if="ownMeal && ownMeal.length > 1 && totalOwnMeal > 0">
                            <strong>總計：</strong> {{ formatCurrency(totalOwnMeal) }}
                        </div>
                        <div class="meal-entry-actions">
                            <button @click="addMealEntry('our_own.' + memberKey + '.meal')" class="add-meal-btn"><i class="fa-solid fa-plus"></i> 新增餐費</button>
                            <div class="action-buttons-group">
                                <button v-if="aiAnalysisEnabled" @click="triggerFileUpload('our_own.' + memberKey + '.meal')" class="ai-receipt-btn" title="AI 收據分析"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                                <button v-if="canClearMeals(ownMeal)" @click="requestClearMeals('our_own.' + memberKey + '.meal')" class="clear-meals-btn" title="清空此區餐費"><i class="fa-solid fa-broom"></i></button>
                                <input type="file" :ref="'fileInput_our_own_' + memberKey + '_meal'" @change="handleFileChange($event, 'our_own.' + memberKey + '.meal')" accept="image/*" style="display: none;">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>自家車費</label>
                    <div class="input-row">
                        <div class="input-wrapper">
                            <input type="text" :value="getFieldValue(ownTransport)" @focus="openCalculator('our_own.' + memberKey + '.transport')" :data-member-path="'our_own.' + memberKey + '.transport'" placeholder="0" readonly>
                        </div>
                    </div>
                </div>
            </template>

            <!-- 其他花費 (如果是 Andrew) -->
            <div v-if="isBrother" class="input-group">
                <label>3D列印</label>
                <input type="text" :value="getFieldValue(brotherPrinter3d)" @focus="openCalculator('reimbursable.' + memberKey + '.printer_3d')" :data-member-path="'reimbursable.' + memberKey + '.printer_3d'" placeholder="0" readonly>
            </div>
        </div>
    `
}