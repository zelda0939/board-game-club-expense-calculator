# 桌遊社花費分攤計算機 (Board Game Club Expense Calculator)

這是一個專為小型團體（特別是家庭成員或朋友之間）設計的費用分攤應用程式。它解決了多人、多類別消費後，需要複雜計算才能理清誰該給誰多少錢的問題。

此專案從一個簡單的本地計算工具，逐步演進為一個功能豐富、整合雲端服務與 AI 技術的 Web 應用程式。

## ✨ 主要功能

### 核心計算
- **多成員費用輸入**：為不同成員（Zelda, Emma, Andrew）獨立記錄開銷。
- **費用分類**：支持「代墊費用」和「自家花費」，並可細分為「餐費」、「車費」等。
- **動態新增項目**：餐費項目可以動態新增或刪除，滿足多筆消費記錄的需求。
- **即時結算**：自動計算成員間的應付/應收差額，結果一目了然。

### 數據管理
- **本地儲存**：
  - **自動保存**：所有輸入會自動暫存，避免意外關閉瀏覽器造成數據遺失。
  - **手動存檔**：可將當前帳目以日期命名儲存，方便日後查閱。
  - **讀取與管理**：可從下拉選單中快速載入、刪除或修改過去的存檔記錄。
- **雲端同步 (Firebase)**：
  - **使用者認證**：透過 Firebase Authentication 實現安全的 email/密碼註冊與登入。
  - **雲端備份/還原**：登入後，可將帳目數據一鍵備份至 Firebase Firestore，或從雲端還原。
  - **自動備份**：可開啟自動備份功能，在數據變動時自動同步至雲端。

### ✨ AI 收據分析 (特色功能)
- **圖片辨識**：登入後，使用者可上傳收據照片。
- **自動填寫**：應用程式會呼叫後端 AI 服務（透過 n8n 工作流整合）分析圖片中的品項與金額。
- **快速入帳**：分析完成後，辨識出的項目會自動新增至對應成員的餐費列表中，大幅提升記帳效率。
- **權限控制**：此功能僅對登入使用者開放。

### 使用者體驗 (UX)
- **整合計算機**：點擊金額輸入框會彈出專用計算機，避免手動輸入錯誤並支援簡易運算。
- **懸浮快捷按鈕 (FAB)**：提供「快速新增費用」、「滾動到結果」、「頁面截圖」等常用功能的快捷入口。
- **費用轉移**：可輕鬆將一筆已記錄的餐費轉移給其他成員或分類。
- **響應式設計**：界面在桌面和行動裝置上均有良好體驗。
- **操作回饋**：透過彈出式訊息提示使用者操作成功、失敗或警告。

## 🛠️ 技術棧

- **前端框架**：Vue.js 3 (透過 CDN 引入的全域 API)
- **後端服務 (BaaS)**：
  - **Firebase Authentication**：用於使用者註冊與登入。
  - **Firebase Firestore**：用於儲存使用者帳目的雲端數據。
- **AI 服務整合**：
  - **n8n.io**：作為中間層工作流，接收前端請求，並與後端 AI 模型（如 Google Gemini）串接進行收據分析。
- **前端技術**：
  - **JavaScript (ESM)**：程式碼模組化，易於維護。
  - **CSS3**：使用 CSS 變數進行主題化設計，樣式清晰。
  - **html2canvas**：用於實現頁面截圖功能。
- **測試**：
  - **QUnit**：用於單元測試。
  - **Sinon.js**：用於建立測試替身 (stubs, mocks)。

## 🚀 如何啟動

1.  **環境準備**：
    - 確保已安裝一個支援 Live Server 的程式碼編輯器（如 VS Code）。
    - 本專案無需 `npm install`，所有依賴均透過 CDN 引入。

2.  **Firebase 設定**：
    - 前往 Firebase 控制台 建立一個新專案。
    - 啟用 **Authentication** (Email/Password 登入方式)。
    - 啟用 **Firestore Database**。
    - 在專案設定中，取得你的 Firebase Web 設定物件。
    - 將設定貼到 `js/firebaseAuth.js` 檔案中的 `firebaseConfig` 變數。

3.  **AI 服務設定 (選用)**：
    - 建立一個 n8n 工作流，並設定一個 Webhook 觸發器。
    - 在工作流中，加入呼叫 AI 模型（如 Gemini API）的節點，用於分析圖片。
    - 將 n8n Webhook 的 URL 貼到 `js/ai/receiptAnalyzer.js` 檔案中的 `N8N_WEBHOOK_URL` 變數。

4.  **本地運行**：
    - 使用 Live Server 打開 `index.html` 即可在瀏覽器中運行。

## 📁 專案結構

```
├── css/                 # CSS 樣式檔案
├── js/
│   ├── ai/              # AI 相關功能
│   │   └── receiptAnalyzer.js
│   ├── components/      # Vue 組件
│   │   └── ExpenseInputGroup.js
│   ├── tests/           # QUnit 測試檔案
│   ├── aiHandlers.js        # AI 相關應用邏輯
│   ├── authHandlers.js      # 認證邏輯
│   ├── calculatorAndInput.js # 計算機與輸入處理
│   ├── CalculatorModal.js   # 計算機 Vue 組件
│   ├── calculationHelpers.js  # 核心計算邏輯
│   ├── dataPersistence.js   # 本地數據儲存
│   ├── firebaseAuth.js      # Firebase 認證底層
│   ├── firebaseHelpers.js   # Firebase 數據庫操作
│   ├── mealEntryHelpers.js  # 餐費項目管理
│   ├── modalHandlers.js     # 各類模態框處理
│   ├── quickAddHandlers.js  # 快速新增功能
│   ├── script.js          # Vue 應用主程式
│   └── ...
├── index.html           # 主頁面
├── test_calculator.html # 測試頁面
└── README.md            # 專案說明文件
```

---

*此專案為個人實踐與學習用途，持續演進中。*