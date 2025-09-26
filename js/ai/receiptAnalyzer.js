/**
 * @file receiptAnalyzer.js
 * @description 透過 Firebase Functions 呼叫後端服務來分析收據圖片。
 */
// import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// 將 YOUR_N8N_WEBHOOK_URL 替換成您在 n8n 中取得的 Webhook URL
const N8N_WEBHOOK_URL = 'https://linebot.paoan.com.tw:8443/n8n_receipt_analyzer';

/**
 * 將圖片檔案轉換為 Base64 字串。
 * @param {File} file - 圖片檔案。
 * @returns {Promise<{imageData: string, mimeType: string}>} - 包含 Base64 資料和 MIME 類型的物件。
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            imageData: reader.result.split(',')[1], // 移除 data:image/...;base64, 前綴
            mimeType: file.type
        });
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

/**
 * 分析收據圖片並提取費用項目。
 * @param {File} imageFile - 使用者上傳的收據圖片。
 * @returns {Promise<Array<{note: string, amount: number}>>} - 解析出的費用項目陣列。
 */
export async function analyzeReceipt(imageFile) {
    if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL') {
        throw new Error('尚未設定 n8n Webhook URL。請在 js/ai/receiptAnalyzer.js 中設定。');
    }

    try {
        const { imageData, mimeType } = await fileToBase64(imageFile);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageData, mimeType }),
        });

        if (!response.ok) {
            throw new Error(`n8n 工作流請求失敗: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result.result;
    } catch (error) {
        console.error("n8n Webhook 呼叫失敗:", error);
        // 拋出一個對使用者更友善的錯誤訊息
        throw new Error(`收據分析失敗: ${error.message}`);
    }
}