/**
 * @file aiHandlers.js
 * @description 處理所有與 AI 服務互動的應用層邏輯，例如收據分析。
 */

import { analyzeReceipt } from './ai/receiptAnalyzer.js';

export default {
    /**
     * 處理從 ExpenseInputGroup 組件傳來的收據分析請求。
     * @param {object} payload - 包含 file 和 path 的物件。
     * @param {File} payload.file - 使用者上傳的圖片檔案。
     * @param {string} payload.path - 目標餐費列表的路徑 (例如 'reimbursable.me.meal')。
     */
    async handleReceiptAnalysis({ file, path }) {
        this.isAnalyzing = true; // 開始分析，凍結畫面
        this.showTempMessage('收據分析中，請稍候...', 'info', 0); // 顯示持續的提示訊息
        const userEmail = this.user ? this.user.email : null; // 獲取登入者的 email
        const userId = this.user ? this.user.uid : null;
        try {
            const items = await analyzeReceipt(file, userEmail, userId); // 將 email 傳入 API
            if (items.success && items.result.length > 0) {
                items.result.forEach(item => {
                    // 確保 amount 是數字且 note 是字串
                    const amount = typeof item.amount === 'number' ? item.amount : 0;
                    const note = typeof item.note === 'string' ? item.note : '';
                    this.addMealEntry(path, amount, note);
                });
                this.hideTempMessage(); // 先關閉「分析中」的訊息
                this.showTempMessage(`成功新增 ${items.result.length} 個項目`, 'success');
            } else {
                this.hideTempMessage(); // 先關閉「分析中」的訊息
                this.showTempMessage(items.success ? 'AI 未能從圖片中解析出任何項目' : items.error, 'error');
            }
        } catch (error) {
            console.error('收據分析失敗:', error);
            this.hideTempMessage(); // 先關閉「分析中」的訊息
            this.showTempMessage(`分析失敗: ${error.message}`, 'error', 5000);
        } finally {
            this.isAnalyzing = false; // 分析結束，解除凍結
        }
    },
}