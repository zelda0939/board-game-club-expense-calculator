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
        brotherPrinter3d: Number
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
        'request-transfer-meal'
    ],
    data() {
        return {
            activeMealMenu: null, // e.g., { path: 'reimbursable.me.meal', index: 0 }
        };
    },
    computed: {
        totalReimbursableMeal() {
            if (!this.reimbursableMeal) return 0;
            return this.reimbursableMeal.reduce((total, meal) => {
                const amount = parseFloat(meal.amount.toString().replace(/,/g, '') || 0);
                return total + amount;
            }, 0);
        },
        totalOwnMeal() {
            if (!this.ownMeal) return 0;
            return this.ownMeal.reduce((total, meal) => {
                const amount = parseFloat(meal.amount.toString().replace(/,/g, '') || 0);
                return total + amount;
            }, 0);
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
        // 處理餐費金額的顯示
        getMealAmountFieldValue(mealArray, index) {
            const amount = mealArray?.[index]?.amount;
            if (amount === null || amount === undefined || amount === '') return '0';
            const sAmount = amount.toString();
            const num = Number(sAmount.replace(/,/g, ''));
            return isNaN(num) ? sAmount : num.toLocaleString();
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
        }
        ,
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
                               :value="getMealAmountFieldValue(reimbursableMeal, index)"
                               @focus="openCalculatorForMeal('reimbursable.' + memberKey + '.meal', index)"
                               placeholder="0" readonly>
                        <input type="text"
                               :value="meal.note"
                               @input="updateMealNote(reimbursableMeal, index, $event)"
                               placeholder="備註">
                        <div class="meal-actions" v-click-outside="() => closeMenuIfActive('reimbursable.' + memberKey + '.meal', index)">
                            <button @click="toggleMealMenu('reimbursable.' + memberKey + '.meal', index)" class="actions-btn"><i class="fa-solid fa-ellipsis-v"></i></button>
                            <transition name="fade-scale">
                                <div v-if="isMenuActive('reimbursable.' + memberKey + '.meal', index)" class="actions-menu">
                                    <button @click="requestTransferMeal('reimbursable.' + memberKey + '.meal', index)" class="transfer-meal-btn"><i class="fa-solid fa-right-left"></i></button>
                                    <button @click="removeMealEntry('reimbursable.' + memberKey + '.meal', index)" class="remove-meal-btn"><i class="fa-solid fa-trash-can"></i></button>
                                </div>
                            </transition>
                        </div>
                    </div>
                    <div class="meal-total" v-if="reimbursableMeal && reimbursableMeal.length > 1 && totalReimbursableMeal > 0">
                        <strong>總計：</strong> {{ formatCurrency(totalReimbursableMeal) }}
                    </div>
                    <button @click="addMealEntry('reimbursable.' + memberKey + '.meal')" class="add-meal-btn"><i class="fa-solid fa-plus"></i> 新增餐費</button>
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
                                   :value="getMealAmountFieldValue(ownMeal, index)"
                                   @focus="openCalculatorForMeal('our_own.' + memberKey + '.meal', index)"
                                   placeholder="0" readonly>
                            <input type="text"
                                   :value="meal.note"
                                   @input="updateMealNote(ownMeal, index, $event)"
                                   placeholder="備註">
                            <div class="meal-actions" v-click-outside="() => closeMenuIfActive('our_own.' + memberKey + '.meal', index)">
                                <button @click="toggleMealMenu('our_own.' + memberKey + '.meal', index)" class="actions-btn"><i class="fa-solid fa-ellipsis-v"></i></button>
                                <transition name="fade-scale">
                                    <div v-if="isMenuActive('our_own.' + memberKey + '.meal', index)" class="actions-menu">
                                        <button @click="requestTransferMeal('our_own.' + memberKey + '.meal', index)" class="transfer-meal-btn"><i class="fa-solid fa-right-left"></i></button>
                                        <button @click="removeMealEntry('our_own.' + memberKey + '.meal', index)" class="remove-meal-btn"><i class="fa-solid fa-trash-can"></i></button>
                                    </div>
                                </transition>
                            </div>
                        </div>
                        <div class="meal-total" v-if="ownMeal && ownMeal.length > 1 && totalOwnMeal > 0">
                            <strong>總計：</strong> {{ formatCurrency(totalOwnMeal) }}
                        </div>
                        <button @click="addMealEntry('our_own.' + memberKey + '.meal')" class="add-meal-btn"><i class="fa-solid fa-plus"></i> 新增餐費</button>
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