/**
 * @file ExpenseInputGroup.js
 * @description 一個 Vue 組件，用於顯示和管理單個成員的費用輸入。
 */

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
        'request-delete-confirmation' // 新增事件
    ],
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
        }
    },
    template: `
        <div class="card">
            <h2>{{ title }}</h2>
            <!-- 代墊費用 -->
            <div class="input-group">
                <label>代墊餐費</label>
                <div class="input-wrapper meal-entries">
                    <div v-for="(meal, index) in reimbursableMeal" :key="index" class="meal-entry">
                        <input type="text"
                               :value="getMealAmountFieldValue(reimbursableMeal, index)"
                               @focus="openCalculatorForMeal('reimbursable.' + memberKey + '.meal', index)"
                               placeholder="0" readonly>
                        <input type="text"
                               :value="meal.note"
                               @input="updateMealNote(reimbursableMeal, index, $event)"
                               placeholder="備註">
                        <button @click="removeMealEntry('reimbursable.' + memberKey + '.meal', index)" class="remove-meal-btn"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                    <button @click="addMealEntry('reimbursable.' + memberKey + '.meal')" class="add-meal-btn"><i class="fa-solid fa-plus"></i> 新增餐費</button>
                </div>
            </div>
            <div class="input-group">
                <label>代墊車費</label>
                <div class="input-row">
                    <div class="input-wrapper">
                        <input type="text" :value="getFieldValue(reimbursableTransport)" @focus="openCalculator('reimbursable.' + memberKey + '.transport')" placeholder="0" readonly>
                    </div>
                </div>
            </div>

            <!-- 自家花費 (如果不是 Andrew) -->
            <template v-if="!isBrother">
                <div class="input-group">
                    <label>自家餐費</label>
                    <div class="input-wrapper meal-entries">
                        <div v-for="(meal, index) in ownMeal" :key="index" class="meal-entry">
                            <input type="text"
                                   :value="getMealAmountFieldValue(ownMeal, index)"
                                   @focus="openCalculatorForMeal('our_own.' + memberKey + '.meal', index)"
                                   placeholder="0" readonly>
                            <input type="text"
                                   :value="meal.note"
                                   @input="updateMealNote(ownMeal, index, $event)"
                                   placeholder="備註">
                            <button @click="removeMealEntry('our_own.' + memberKey + '.meal', index)" class="remove-meal-btn"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                        <button @click="addMealEntry('our_own.' + memberKey + '.meal')" class="add-meal-btn"><i class="fa-solid fa-plus"></i> 新增餐費</button>
                    </div>
                </div>
                <div class="input-group">
                    <label>自家車費</label>
                    <div class="input-row">
                        <div class="input-wrapper">
                            <input type="text" :value="getFieldValue(ownTransport)" @focus="openCalculator('our_own.' + memberKey + '.transport')" placeholder="0" readonly>
                        </div>
                    </div>
                </div>
            </template>

            <!-- 其他花費 (如果是 Andrew) -->
            <div v-if="isBrother" class="input-group">
                <label>Andrew 3D列印</label>
                <input type="text" :value="getFieldValue(brotherPrinter3d)" @focus="openCalculator('reimbursable.' + memberKey + '.printer_3d')" placeholder="0" readonly>
            </div>
        </div>
    `
}
