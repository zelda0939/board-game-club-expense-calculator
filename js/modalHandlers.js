/**
 * @file modalHandlers.js
 * @description 這個模組包含所有用於顯示、確認和取消各種應用程式模態框（例如臨時消息、自定義確認、日期更改和覆蓋確認）的方法。
 */
export default {
    // 新增：顯示短暫的提示訊息
    showTempMessage(message, type = 'info', duration) {
        this.tempMessageModal.message = message;
        this.tempMessageModal.type = type; // 新增類型，用於樣式區分
        this.tempMessageModal.visible = true;
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        // 根據訊息長度自動調整顯示時間
        const messageLength = message.length; // 訊息字數
        const readingSpeed = 18; // 每秒閱讀字數 (例如 4 個中文字/秒)
        let displayDuration = duration || (Math.ceil(messageLength / readingSpeed) * 1000); // 計算毫秒數

        // 設定最小和最大顯示時間
        const minDuration = 1500; // 1.5 秒
        const maxDuration = 5000; // 5 秒

        displayDuration = Math.max(minDuration, Math.min(displayDuration, maxDuration));

        this.messageTimeout = setTimeout(() => {
            this.tempMessageModal.visible = false;
        }, displayDuration); // 根據計算出的時間消失
    },
    // 自定義模態框確認動作
    confirmAction(actionType) {
        this.customModal.visible = false;
        if (actionType === 'load') {
            this.processSaveEntrySelection('load'); // 點擊「載入」表示載入
        } else if (actionType === 'delete') {
            this.processSaveEntrySelection('delete'); // 點擊「刪除」表示刪除
        } else if (actionType === 'changeDate') {
            // 開啟修改日期模態框
            this.dateChangeModal.originalDate = this.pendingSaveEntry; // 將當前選擇的日期作為原始日期
            this.dateChangeModal.newDate = this.pendingSaveEntry; // 預設新日期為原始日期
            this.dateChangeModal.visible = true;
        }
    },
    // 確認修改日期
    confirmDateChange() {
        this.updateEntryDate(this.dateChangeModal.originalDate, this.dateChangeModal.newDate);
        this.dateChangeModal.visible = false;
        this.selectedSaveEntry = ''; // 修改日期後重置下拉選單
    },
    // 取消修改日期
    cancelDateChange() {
        this.dateChangeModal.visible = false;
        this.selectedSaveEntry = ''; // 取消修改日期後重置下拉選單
    },
    // 取消自定義模態框
    cancelCustomModal() {
        this.customModal.visible = false;
        this.selectedSaveEntry = ''; // 重置下拉選單
        this.pendingSaveEntry = ''; // 清空暫存的日期
    },
    // 開啟日期選擇器 (用於 input type="date")
    openDatePicker() {
        // 檢查瀏覽器是否支援 showPicker() 方法
        if (this.$refs.dateInput && typeof this.$refs.dateInput.showPicker === 'function') {
            this.$refs.dateInput.showPicker();
        }
    },
    // 顯示覆蓋確認模態框
    showOverwriteConfirm(originalDate, newDate) {
        this.overwriteConfirmModal.originalDate = originalDate;
        this.overwriteConfirmModal.newDate = newDate;
        this.overwriteConfirmModal.message = `日期 ${newDate} 已存在。您要覆蓋現有數據嗎？`;
        this.overwriteConfirmModal.visible = true;
    },
    // 處理覆蓋確認模態框的選擇
    handleOverwriteChoice(overwrite) {
        this.overwriteConfirmModal.visible = false;
        if (overwrite) {
            // 執行覆蓋操作
            this.updateEntryDate(this.overwriteConfirmModal.originalDate, this.overwriteConfirmModal.newDate, true);
        } else {
            // 取消覆蓋，重置日期變更模態框狀態
            this.dateChangeModal.visible = false;
            this.selectedSaveEntry = '';
        }
    }
};
