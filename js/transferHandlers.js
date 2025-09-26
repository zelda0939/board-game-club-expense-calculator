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
            sourceMemberKey,
            isCopy: false // Default to transfer (move)
        };
    },
    handleRequestCopyMeal({ path, index }) {
        const pathParts = path.split('.');
        const sourceMemberKey = pathParts[1];
        this.transferMealModal = {
            visible: true,
            path,
            index,
            sourceMemberKey,
            isCopy: true // Set flag for copy
        };
    },
    executeMealTransfer(target) { // target is now an object
        const { path, index, isCopy } = this.transferMealModal;
        const pathParts = path.split('.');
        const sourceCategory = pathParts[0];
        const sourceMemberKey = pathParts[1];

        const mealToTransfer = this[sourceCategory][sourceMemberKey].meal[index];

        // 使用 addMealEntry 來新增到目標，這樣就能套用「覆寫空項目」的邏輯
        const targetPath = `${target.categoryKey}.${target.memberKey}.meal`;
        this.addMealEntry(targetPath, mealToTransfer.amount, mealToTransfer.note);

        // 如果不是複製，則從來源移除
        if (!isCopy) {
            this[sourceCategory][sourceMemberKey].meal.splice(index, 1);
        }

        this.cancelMealTransfer();
        this.showTempMessage(isCopy ? '餐費已複製。' : '餐費已轉移。');
    },
    cancelMealTransfer() {
        this.transferMealModal = { visible: false, path: '', index: -1, sourceMemberKey: '', isCopy: false };
    },
};