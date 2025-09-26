/**
 * @file receiptAnalyzer.js
 * @description 透過 Firebase Functions 呼叫後端服務來分析收據圖片。
 */
// import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// 將 YOUR_N8N_WEBHOOK_URL 替換成您在 n8n 中取得的 Webhook URL
const N8N_WEBHOOK_URL = 'https://linebot.paoan.com.tw:8443/n8n_receipt_analyzer';

/**
 * 分析收據圖片並提取費用項目。
 * @param {File} imageFile - 使用者上傳的收據圖片。
 * @param {string|null} userEmail - 登入使用者的 email。
 * @returns {Promise<Array<{note: string, amount: number}>>} - 解析出的費用項目陣列。
 */
export async function analyzeReceipt(imageFile, userEmail, userId) {
    if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL') {
        throw new Error('尚未設定 n8n Webhook URL。請在 js/ai/receiptAnalyzer.js 中設定。');
    }

    try {
        // 1. 建立 FormData 物件
        const formData = new FormData();

        // 2. 將圖片檔案(二進位)和其他資料附加到 FormData 中
        //    'file' 是欄位名稱，n8n 端會用這個名稱來接收檔案
        formData.append('file', imageFile);
        formData.append('userEmail', userEmail || '');
        formData.append('userId', userId || '');

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData, // 3. 直接將 formData 作為 body，fetch 會自動設定 Content-Type 為 multipart/form-data
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("n8n Webhook 呼叫失敗:", error);
        // 拋出一個對使用者更友善的錯誤訊息
        throw new Error(`收據分析失敗: ${error.message}`);
    }
}