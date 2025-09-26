/**
 * @file transferHandlers.js
 * @description This module contains methods for handling the transfer of meal entries between members and categories.
 */
export default {
    handleRequestTransferMeal({ path, index }) {
        const pathParts = path.split('.');
        const sourceMemberKey = pathParts[1];
        this.transferMealModal = {
            visible: true,
            path,
            index,
            sourceMemberKey
        };
    },
    executeMealTransfer(target) { // target is now an object
        const { path, index } = this.transferMealModal;
        const pathParts = path.split('.');
        const sourceCategory = pathParts[0];
        const sourceMemberKey = pathParts[1];

        const mealToTransfer = this[sourceCategory][sourceMemberKey].meal[index];

        // 使用 addMealEntry 來新增到目標，這樣就能套用「覆寫空項目」的邏輯
        const targetPath = `${target.categoryKey}.${target.memberKey}.meal`;
        this.addMealEntry(targetPath, mealToTransfer.amount, mealToTransfer.note);

        // 從來源移除
        this[sourceCategory][sourceMemberKey].meal.splice(index, 1);

        this.cancelMealTransfer();
        this.showTempMessage('餐費已轉移。');
    },
    cancelMealTransfer() {
        this.transferMealModal = { visible: false, path: '', index: -1, sourceMemberKey: '' };
    },
};