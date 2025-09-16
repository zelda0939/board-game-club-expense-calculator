/**
 * @file dataPersistence.js
 * @description 這個模組處理所有與應用程式數據在 localStorage 中的保存、載入、清空、更新和刪除相關的邏輯。
 * 它包含了處理儲存條目選擇和日期變更的方法。
 */
export const initialData = {
    reimbursable: {
        me: {
            meal: [{ amount: 0, note: '' }], // 將餐費改為陣列，用於儲存多個餐費項目
            transport: 0
        },
        wife: {
            meal: [{ amount: 0, note: '' }], // 將餐費改為陣列
            transport: 0
        },
        brother: {
            meal: [{ amount: 0, note: '' }], // 將餐費改為陣列
            transport: 0,
            printer_3d: 0
        }
    },
    our_own: {
        me: {
            meal: [{ amount: 0, note: '' }], // 將餐費改為陣列
            transport: 0
        },
        wife: {
            meal: [{ amount: 0, note: '' }], // 將餐費改為陣列
            transport: 0
        }
    },
    calculatorState: {
        visible: false,
        initialValue: '',
        targetPath: ''
    }
};

export default {
    // 新增：處理從 localStorage 載入數據時的結構轉換
    assignSavedData(targetObj, sourceObj) {
        if (!sourceObj) return;

        for (const key in targetObj) {
            if (Object.hasOwnProperty.call(targetObj, key)) {
                if (key === 'meal') {
                    if (Array.isArray(sourceObj[key])) {
                        // 如果 source meal 已經是陣列，使用它，確保 amount/note 結構
                        targetObj[key] = sourceObj[key].map(item => ({
                            amount: Number(item.amount.toString().replace(/,/g, '') || 0),
                            note: item.note || ''
                        }));
                        if (targetObj[key].length === 0) { // 確保如果為空，至少有一個空項目
                            targetObj[key].push({ amount: 0, note: '' });
                        }
                    } else if (typeof sourceObj[key] === 'number' || typeof sourceObj[key] === 'string') {
                        // 如果舊的 meal 數據是數字/字串，轉換為新的陣列結構
                        targetObj[key] = [{ amount: Number(sourceObj[key].toString().replace(/,/g, '')) || 0, note: '' }];
                    } else {
                        // 如果 source 數據缺失或 meal 無效，預設為空項目
                        targetObj[key] = [{ amount: 0, note: '' }];
                    }
                } else if (typeof targetObj[key] === 'object' && targetObj[key] !== null) {
                    // 遞迴處理巢狀物件 (例如 me, wife, brother)
                    this.assignSavedData(targetObj[key], sourceObj[key] || {});
                } else if (sourceObj[key] !== undefined) {
                    // 對於其他簡單屬性 (例如 transport, printer_3d)，直接賦值 (確保為數字)
                    targetObj[key] = Number(sourceObj[key].toString().replace(/,/g, '')) || 0;
                }
            }
        }
    },
    // 清空所有輸入
    clearInputs() {
        // 使用初始數據結構重置所有欄位
        Object.assign(this.$data, JSON.parse(JSON.stringify(initialData)));
        localStorage.removeItem('familyCostCalculator');
        this.selectedSaveEntry = '';
        // 重新載入保存的項目，確保下拉選單更新但數據不被清除
        this.loadSavedEntries();
        this.selectedSaveEntry = ''; // 再次確保 selectedSaveEntry 為空，覆蓋 loadSavedEntries 的預設選擇
    },
    // 新增：保存當前數據
    saveCurrentData() {
        const today = new Date().toISOString().slice(0, 10); // 使用 ISO 格式的日期，例如 "2025-09-12"
        let currentData = {
            reimbursable: JSON.parse(JSON.stringify(this.reimbursable)),
            our_own: JSON.parse(JSON.stringify(this.our_own)),
            date: today
        };

        // 檢查是否已存在當天數據，如果存在則更新，否則新增
        const existingIndex = this.savedEntries.findIndex(entry => entry.date === today);
        if (existingIndex !== -1) {
            this.savedEntries[existingIndex] = currentData;
            this.showTempMessage(`數據已更新至 ${today}。`);
        } else {
            // 如果超過20筆，移除最舊的一筆
            if (this.savedEntries.length >= 20) {
                this.savedEntries.shift(); // 移除第一個元素（最舊的）
            }
            this.savedEntries.push(currentData);
            this.showTempMessage(`保存成功：${today}。`);
        }
        localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(this.savedEntries));
        this.selectedSaveEntry = ''; // 保存後重置下拉選單為空
    },
    // 新增：處理載入/刪除選擇 (顯示自定義模態框)
    handleSaveEntrySelection() {
        if (!this.selectedSaveEntry) {
            return; // 如果沒有選擇任何項目，直接返回
        }
        this.customModal.title = '操作確認';
        this.customModal.message = `您想對 ${this.selectedSaveEntry} 的數據執行什麼操作？`;
        this.customModal.type = 'confirm';
        this.customModal.visible = true;
        // 將選擇的日期暫存起來，待模態框確認後使用
        this.pendingSaveEntry = this.selectedSaveEntry;
    },
    // 處理模態框確認後的載入/刪除邏輯
    processSaveEntrySelection(action) {
        const entryDate = this.pendingSaveEntry;
        if (!entryDate) return; // 沒有待處理的選擇

        if (action === 'load') {
            this.loadDataByDate(entryDate);
        } else if (action === 'delete') {
            this.deleteDataByDate(entryDate);
        } else if (action === 'changeDate') {
            // 修改日期邏輯
            this.customModal.title = '修改日期';
            this.customModal.message = `您想將 ${entryDate} 的數據修改為哪一天？`;
            this.customModal.type = 'info'; // 修改日期是資訊提示，不是確認
            this.customModal.visible = true;
            this.pendingSaveEntry = entryDate; // 暫存選擇的日期
        }
        this.pendingSaveEntry = ''; // 清空待處理的選擇
        this.selectedSaveEntry = ''; // 重置下拉選單
    },
    // 新增：更新數據的日期
    updateEntryDate(originalDate, newDate, overwrite = false) {
        const originalEntryIndex = this.savedEntries.findIndex(entry => entry.date === originalDate);
        const newDateEntryIndex = this.savedEntries.findIndex(entry => entry.date === newDate);

        if (originalEntryIndex === -1) {
            this.showTempMessage('未找到原始數據可更新日期。');
            return;
        }

        // 如果新日期與原始日期相同，則不執行任何操作
        if (originalDate === newDate) {
            this.showTempMessage('日期未更改。');
            return;
        }

        // 檢查新日期是否已經存在 (只在非覆蓋模式下檢查)
        // 如果新日期存在且不是修改自己的日期，則觸發覆蓋確認
        if (!overwrite && newDateEntryIndex !== -1 && originalEntryIndex !== newDateEntryIndex) {
            this.showOverwriteConfirm(originalDate, newDate);
            return;
        }

        // --- 實際的更新/覆蓋邏輯從這裡開始 --- 

        if (overwrite && newDateEntryIndex !== -1 && originalEntryIndex !== newDateEntryIndex) {
            // 使用者選擇覆蓋。
            // 這意味著：將 originalDate 項目移動到 newDate，並刪除原 newDate 項目。

            // 1. 儲存 originalDate 的數據副本，準備移動
            const dataToMove = { ...this.savedEntries[originalEntryIndex] };
            dataToMove.date = newDate; // 將副本的日期更新為新日期

            // 2. 刪除原 newDate 的數據項目
            this.savedEntries.splice(newDateEntryIndex, 1);

            // 3. 調整 originalEntryIndex，因為刪除了一個項目
            // 如果 originalEntryIndex 在 newDateEntryIndex 之後，則索引會減 1
            let actualOriginalEntryIndex = originalEntryIndex;
            if (originalEntryIndex > newDateEntryIndex) {
                actualOriginalEntryIndex--;
            }

            // 4. 刪除原 originalDate 的數據項目
            this.savedEntries.splice(actualOriginalEntryIndex, 1);

            // 5. 將移動後的數據（dataToMove）添加到 savedEntries
            this.savedEntries.push(dataToMove);

            this.showTempMessage(`覆蓋成功。`);

        } else { // 正常修改日期 (沒有衝突，或選擇不覆蓋)
            // 這處理了以下情況：
            // 1. 使用者將日期更改為一個獨特的新日期。
            // 2. 使用者選擇取消覆蓋 (overwrite 為 false，因此執行此路徑)。
            
            // 更新原始項目的日期
            this.savedEntries[originalEntryIndex].date = newDate;
            this.showTempMessage(`數據日期已從 ${originalDate} 更新為 ${newDate}。`);
        }

        // 重新排序 savedEntries 以保持有序
        this.savedEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(this.savedEntries));
    },
    // 載入指定日期的數據
    loadDataByDate(date) {
        const savedData = this.savedEntries.find(entry => entry.date === date);
        if (savedData) {
            this.assignSavedData(this.reimbursable, savedData.reimbursable);
            this.assignSavedData(this.our_own, savedData.our_own);
            this.showTempMessage(`已載入 ${date} 數據。`);
        } else {
            this.showTempMessage('未找到數據。');
        }
    },
    // 新增：刪除指定日期的數據
    deleteDataByDate(date) {
        const initialLength = this.savedEntries.length;
        this.savedEntries = this.savedEntries.filter(entry => entry.date !== date);
        if (this.savedEntries.length < initialLength) {
            localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(this.savedEntries));
            this.showTempMessage(`已刪除 ${date} 數據。`);
        } else {
            this.showTempMessage('未找到數據可刪除。');
        }
    },
    // 新增：載入已保存的數據
    loadSavedEntries() {
        const savedEntriesString = localStorage.getItem('familyCostCalculatorSavedEntries');
        if (savedEntriesString) {
            this.savedEntries = JSON.parse(savedEntriesString);
        } else {
            this.savedEntries = []; // 如果沒有保存的數據，則初始化為空陣列
        }
        this.selectedSaveEntry = ''; // 確保初始載入時為空
    },
};