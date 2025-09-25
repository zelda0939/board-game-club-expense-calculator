/**
 * @file quickAddHandlers.js
 * @description 處理「快速新增」模態框的所有相關邏輯，包括開啟、關閉、儲存和與計算機的互動。
 */

export default {
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
            const path = `${category}.${person}.${expenseType}`;
            this.addMealEntry(path, numericAmount, note);
            this.scrollToExpenseItem(path, person);
        } else {
            const path = `${category}.${person}.${expenseType}`;
            this.updateValueFromCalculator({ path, value: this.formatCurrency(numericAmount) });
            this.scrollToExpenseItem(path, person);
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
};