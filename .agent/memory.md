# 專案記憶 (Project Memory)

## 任務：新增 Andrew 的 3D 列印明細顯示
- **關鍵提示詞**：Andrew的3D列印若有金額 也要在明細的地方顯示出來
- **決策與修改**：
  - 在 `js/script.js` 增加 `printer3dDetail` 計算屬性以抽取 3D 列印金額。
  - 在 `index.html` 的結果明細區增加 `v-if="printer3dDetail > 0"` 的 3D 列印明細卡片，並加上 `.printer3d-detail-card`。
  - 修改 `js/uiHelpers.js` 截取結果截圖（`captureScreenshot('results')`）的邏輯，將 `.printer3d-detail-card` 加進 `selectors` 陣列中，確保該區塊也能被成功截圖。
  - 使用繁體中文進行所有紀錄與註解（遵守系統全局規則）。
