/**
 * @file calculationHelpers.js
 * @description 這個模組包含用於計算各成員總支出和相關財務邏輯的輔助方法。
 */
export default {
    // 計算單個成員的總支出
    calculateMemberTotal(memberExpenses) {
        let total = 0;
        for (const key in memberExpenses) {
            if (Object.hasOwnProperty.call(memberExpenses, key)) {
                if (key === 'meal' && Array.isArray(memberExpenses[key])) {
                    memberExpenses[key].forEach(meal => {
                        total += parseFloat(meal.amount.toString().replace(/,/g, '')) || 0;
                    });
                } else {
                    // 將儲存的字串轉換為數字進行計算
                    total += parseFloat(memberExpenses[key].toString().replace(/,/g, '')) || 0;
                }
            }
        }
        return total;
    },
};
