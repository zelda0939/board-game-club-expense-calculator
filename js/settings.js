/**
 * @file settings.js
 * @description 該模組用於統一管理 localStorage 中的應用程式設定。
 */

const SETTINGS_KEY = 'boardGameClubCalculator';

// 獲取預設設定
function getDefaultSettings() {
    return {
        savedEntries: [],
        rememberedEmail: '',
        autoBackupEnabled: false,
        currentData: null // 用於儲存最後一次的輸入數據
    };
}

// 從 localStorage 讀取設定
export function getSettings() {
    try {
        const settingsString = localStorage.getItem(SETTINGS_KEY);
        if (settingsString) {
            return { ...getDefaultSettings(), ...JSON.parse(settingsString) };
        }
    } catch (error) {
        console.error("無法解析 localStorage 中的設定:", error);
        // 如果解析失敗，返回預設值
    }
    return getDefaultSettings();
}

// 將設定保存到 localStorage
export function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("無法保存設定到 localStorage:", error);
    }
}
