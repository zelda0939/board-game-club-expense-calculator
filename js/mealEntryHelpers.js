/**
 * @file mealEntryHelpers.js
 * @description 這個模組包含處理餐費項目（meal entries）的新增、移除、獲取和更新金額，以及開啟餐費計算機的方法。
 */
export default {
    // 新增餐費項目
    addMealEntry(memberPath, amount = 0, note = '') {
        const { target, key } = this.getTargetObjectAndKey(memberPath);
        // 清理和轉換 amount，確保它是一個數字
        const numericAmount = Number(String(amount).replace(/,/g, '')) || 0;
        const mealArray = target[key];

        if (Array.isArray(mealArray)) {
            const lastEntry = mealArray.length > 0 ? mealArray[mealArray.length - 1] : null;

            // 檢查最後一筆餐費是否為空（金額為0/null/空字串 且 沒有備註）
            const isLastEntryEmpty = lastEntry && (lastEntry.amount === 0 || lastEntry.amount === null || lastEntry.amount === '') && lastEntry.note === '';

            if (isLastEntryEmpty) {
                // 如果是空的，直接更新最後一筆
                mealArray[mealArray.length - 1] = { amount: numericAmount, note: note };
            } else {
                // 否則，新增一筆新的
                mealArray.push({ amount: numericAmount, note: note });
            }
        }
    },
    // 移除餐費項目
    removeMealEntry(memberPath, index) {
        const { target, key } = this.getTargetObjectAndKey(memberPath);
        target[key].splice(index, 1);
    },
    // 獲取餐費項目的金額值
    getMealAmountFieldValue(memberPath, index) {
        const { target, key } = this.getTargetObjectAndKey(memberPath);
        // 在回傳前使用 formatCurrency 格式化
        return this.formatCurrency(target[key][index].amount);
    },
    // 更新餐費項目的金額值
    updateMealAmountFromInput({ path, index, value }) {
        const { target, key } = this.getTargetObjectAndKey(path);
        target[key][index].amount = value;
    },
    // 為餐費項目開啟計算機
    openCalculatorForMeal(memberPath, index) {
        const { target, key } = this.getTargetObjectAndKey(memberPath);
        const meal = target[key][index];
        this.calculatorState.targetPath = `${memberPath}.${index}.amount`;
        this.calculatorState.initialValue = meal.amount.toString().replace(/,/g, '');
        this.calculatorState.visible = true;
    },
};