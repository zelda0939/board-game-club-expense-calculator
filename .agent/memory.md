# 專案記憶 (Project Memory)

## 任務：新增 Andrew 的 3D 列印明細顯示
- **關鍵提示詞**：Andrew的3D列印若有金額 也要在明細的地方顯示出來
- **決策與修改**：
  - 在 `js/script.js` 增加 `printer3dDetail` 計算屬性以抽取 3D 列印金額。
  - 在 `index.html` 的結果明細區增加 `v-if="printer3dDetail > 0"` 的 3D 列印明細卡片，並加上 `.printer3d-detail-card`。
  - 修改 `js/uiHelpers.js` 截取結果截圖（`captureScreenshot('results')`）的邏輯，將 `.printer3d-detail-card` 加進 `selectors` 陣列中，確保該區塊也能被成功截圖。
  - 使用繁體中文進行所有紀錄與註解（遵守系統全局規則）。

## 任務：餐費明細支援拖曳排序
- **關鍵提示詞**：讓每行品項金額可以拖曳調整順序 可以使用套件
- **決策與修改**：
  - 在 `index.html` 中引入 `SortableJS` CDN。
  - 將拖曳的 handle 指定為原本右側的 `.actions-btn` (功能選單按鈕)，並移除額外新增的拖曳圖示。
  - 在 `css/style.css` 增加 `.actions-btn` 的拖曳游標樣式 (`cursor: grab/grabbing`)。
  - 修改 `js/mealEntryHelpers.js` 裡的 `addMealEntry`，確保每筆新的餐費都自動產生一個唯一的 `id`，以利 Vue 能綁定唯一 key，避免與 Sortable 的 DOM 移動衝突。
  - 在 `js/components/ExpenseInputGroup.js` 中的餐費列表區塊外層加入 `class="meal-list"` 和 `ref` 作為 Sortable 容器。
  - 於 `ExpenseInputGroup.js` 的 `mounted` 與 `updated` 階段建立或更新 SortableJS 的實例，在拖曳排序的 `onEnd` 事件被觸發時更新原始資料 (`reimbursableMeal` 與 `ownMeal`) 並向外 emit。
