/**
 * @file calculatorAndInput.js
 * @description 這個模組包含所有與輸入欄位處理、金額格式化、計算機模態框的開啟和值更新相關的輔助方法。
 */
export default {
    // 格式化貨幣顯示 (固定顯示千位分隔符號)
    formatCurrency(value) {
        if (typeof value === 'number' && isFinite(value)) {
            return value.toLocaleString('zh-TW', { maximumFractionDigits: 10 });
        }
        // 如果是字串，嘗試轉換為數字再格式化
        const numValue = Number(String(value).replace(/,/g, ''));
        if (!isNaN(numValue) && isFinite(numValue)) {
            return numValue.toLocaleString('zh-TW', { maximumFractionDigits: 10 });
        }
        return value; // 無法格式化則返回原始值
    },
    getFieldValue(fieldPath) {
        const { target, key } = this.getTargetObjectAndKey(fieldPath);
        // 在回傳前使用 formatCurrency 格式化
        return this.formatCurrency((target && typeof target === 'object' && key in target) ? target[key] : '0');
    },
    // 輔助函式：根據路徑獲取目標物件和最終屬性鍵
    getTargetObjectAndKey(path) {
        const parts = path.split('.');
        let target = this;
        for (let i = 0; i < parts.length - 1; i++) {
            target = target[parts[i]];
        }
        return { target, key: parts[parts.length - 1] };
    },
    openCalculator(fieldPath) {
        this.calculatorState.targetPath = fieldPath;
        // 獲取當前欄位的值作為初始值，並在傳遞給計算機之前移除千位分隔符號
        const { target, key } = this.getTargetObjectAndKey(fieldPath);
        const currentValue = target[key]; // 現在 currentValue 是字串
        this.calculatorState.initialValue = (currentValue !== undefined && currentValue !== null) ? currentValue.toString().replace(/,/g, '') : '';
        this.calculatorState.visible = true;
    },
    updateValueFromCalculator({ path, value }) {
        // 專門處理快速新增模態框的金額更新
        if (path === 'quickAddModal.amount') {
            this.quickAddModal.amount = value;
            return;
        }

        const pathParts = path.split('.');
        // 檢查 path 是否包含數字索引，判斷是否為餐費項目
        const isMealEntry = !isNaN(parseInt(pathParts[pathParts.length - 2]));

        if (isMealEntry) {
            const lastPart = pathParts.pop(); // 應該是 'amount'
            const index = parseInt(pathParts.pop()); // 應該是餐費的索引
            const actualPath = pathParts.join('.'); // 應該是 'reimbursable.me.meal' 等

            const { target, key } = this.getTargetObjectAndKey(actualPath);

            if (target && Array.isArray(target[key]) && target[key][index]) {
                target[key][index][lastPart] = value; // 更新 amount
            }
        } else {
            // 如果不是餐費項目，則走原有邏輯 (例如車費或3D列印費)
            const { target, key } = this.getTargetObjectAndKey(path);
            target[key] = value; // 直接賦值為字串 (已由 CalculatorModal 格式化)
        }
    },
    updateValueFromInput({ path, value }) {
        const { target, key } = this.getTargetObjectAndKey(path);
        // 直接儲存輸入字串，計算時再轉換
        target[key] = value;
    },
};