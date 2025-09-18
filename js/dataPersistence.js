/**
 * @file dataPersistence.js
 * @description 這個模組處理所有與應用程式數據在 localStorage 中的保存、載入、清空、更新和刪除相關的邏輯。
 * 它包含了處理儲存條目選擇和日期變更的方法。
 */
import { getSettings, saveSettings } from './settings.js';

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
                        // 如果 source 敱據缺失或 meal 無效，預設為空項目
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
        
        const settings = getSettings();
        settings.currentData = null;
        saveSettings(settings);

        this.selectedSaveEntry = '';
        this.loadSavedEntries();
        this.selectedSaveEntry = '';
    },
    // 新增：保存當前數據
    saveCurrentData() {
        const today = new Date().toISOString().slice(0, 10); // 使用 ISO 格式的日期，例如 "2025-09-12"
        let currentData = {
            reimbursable: JSON.parse(JSON.stringify(this.reimbursable)),
            our_own: JSON.parse(JSON.stringify(this.our_own)),
            date: today
        };

        const existingIndex = this.savedEntries.findIndex(entry => entry.date === today);
        if (existingIndex !== -1) {
            this.savedEntries[existingIndex] = currentData;
            this.showTempMessage(`數據已更新至 ${today}。`);
        } else {
            if (this.savedEntries.length >= 20) {
                this.savedEntries.shift();
            }
            this.savedEntries.push(currentData);
            this.showTempMessage(`保存成功：${today}。`);
        }

        const settings = getSettings();
        settings.savedEntries = this.savedEntries;
        saveSettings(settings);

        this.selectedSaveEntry = '';
    },
    // 新增：處理載入/刪除選擇 (顯示自定義模態框)
    handleSaveEntrySelection() {
        if (!this.selectedSaveEntry) {
            return;
        }
        this.customModal.title = '操作確認';
        this.customModal.message = `您想對 ${this.selectedSaveEntry} 的數據執行什麼操作？`;
        this.customModal.type = 'confirm';
        this.customModal.visible = true;
        this.pendingSaveEntry = this.selectedSaveEntry;
    },
    // 處理模態框確認後的載入/刪除邏輯
    processSaveEntrySelection(action) {
        const entryDate = this.pendingSaveEntry;
        if (!entryDate) return;

        if (action === 'load') {
            this.loadDataByDate(entryDate);
        } else if (action === 'delete') {
            this.deleteDataByDate(entryDate);
        } else if (action === 'changeDate') {
            this.customModal.title = '修改日期';
            this.customModal.message = `您想將 ${entryDate} 的數據修改為哪一天？`;
            this.customModal.type = 'info';
            this.customModal.visible = true;
            this.pendingSaveEntry = entryDate;
        }
        this.pendingSaveEntry = '';
        this.selectedSaveEntry = '';
    },
    // 新增：更新數據的日期
    updateEntryDate(originalDate, newDate, overwrite = false) {
        const originalEntryIndex = this.savedEntries.findIndex(entry => entry.date === originalDate);
        const newDateEntryIndex = this.savedEntries.findIndex(entry => entry.date === newDate);

        if (originalEntryIndex === -1) {
            this.showTempMessage('未找到原始數據可更新日期。');
            return;
        }

        if (originalDate === newDate) {
            this.showTempMessage('日期未更改。');
            return;
        }

        if (!overwrite && newDateEntryIndex !== -1 && originalEntryIndex !== newDateEntryIndex) {
            this.showOverwriteConfirm(originalDate, newDate);
            return;
        }

        if (overwrite && newDateEntryIndex !== -1 && originalEntryIndex !== newDateEntryIndex) {
            const dataToMove = { ...this.savedEntries[originalEntryIndex] };
            dataToMove.date = newDate;
            this.savedEntries.splice(newDateEntryIndex, 1);
            let actualOriginalEntryIndex = originalEntryIndex;
            if (originalEntryIndex > newDateEntryIndex) {
                actualOriginalEntryIndex--;
            }
            this.savedEntries.splice(actualOriginalEntryIndex, 1);
            this.savedEntries.push(dataToMove);
            this.showTempMessage(`覆蓋成功。`);
        } else {
            this.savedEntries[originalEntryIndex].date = newDate;
            this.showTempMessage(`數據日期已從 ${originalDate} 更新為 ${newDate}。`);
        }

        this.savedEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const settings = getSettings();
        settings.savedEntries = this.savedEntries;
        saveSettings(settings);
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
            const settings = getSettings();
            settings.savedEntries = this.savedEntries;
            saveSettings(settings);
            this.showTempMessage(`已刪除 ${date} 數據。`);
        } else {
            this.showTempMessage('未找到數據可刪除。');
        }
    },
    // 新增：載入已保存的數據
    loadSavedEntries() {
        const settings = getSettings();
        this.savedEntries = settings.savedEntries || [];
        this.selectedSaveEntry = '';
    },
    saveAndBackupData(context) {
        const settings = getSettings();
        settings.currentData = {
            reimbursable: context.reimbursable,
            our_own: context.our_own,
        };
        saveSettings(settings);

        if (context.user && !context.isSyncing && context.enableAutoBackup) {
            context.backupToCloud(true);
        }
    }
};