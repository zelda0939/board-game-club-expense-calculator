/**
 * @file screenshotHandlers.js
 * @description 處理截圖選項模態框的顯示、隱藏以及觸發截圖動作的相關邏輯。
 */

export default {
    /**
     * 顯示截圖選項模態框。
     */
    showScreenshotOptions() {
        this.screenshotOptionsModal.visible = true;
        if (this.fabMenuOpen) {
            this.toggleFabMenu(); // 關閉 FAB 選單
        }
    },

    /**
     * 隱藏截圖選項模態框。
     */
    hideScreenshotOptions() {
        this.screenshotOptionsModal.visible = false;
    },

    /**
     * 根據選擇的類型開始截圖。
     * @param {string} type - 截圖類型 ('full' 或 'results')。
     */
    startScreenshot(type) {
        this.hideScreenshotOptions();
        // 確保模態框消失的動畫完成後再執行截圖，避免截到模態框
        this.$nextTick(() => {
            this.captureScreenshot(type);
        });
    },
};