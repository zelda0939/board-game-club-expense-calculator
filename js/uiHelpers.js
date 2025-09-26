/**
 * @file uiHelpers.js
 * @description 包含與 UI 互動相關的輔助函式，例如滾動。
 */
import { scrollToElement } from './utils/scrollUtils.js';

export default {
    /**
     * 滾動到指定的費用項目。
     * @param {string} path - 費用項目的路徑，例如 'reimbursable.me.meal' 或 'reimbursable.me.transport'。
     * @param {string} person - 成員的 key，例如 'me'。
     */
    scrollToExpenseItem(path, person) {
        this.$nextTick(() => {
            try {
                const refName = `group-${person}`;
                const groupComp = this.$refs?.[refName];

                if (groupComp?.scrollToPath && groupComp.scrollToPath(path)) {
                    return;
                }

                const targetElement = document.querySelector(`[data-member-path="${path}"]`);
                scrollToElement(targetElement);
            } catch (e) {
                console.error('Error scrolling to expense item:', e);
            }
        });
    },

    /**
     * 將畫面平滑滾動到計算結果區塊。
     */
    scrollToResults() {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * 將畫面平滑滾動到頁面頂部。
     */
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * 根據指定類型截取畫面並觸發下載。
     * @param {string} type - 截圖類型，可以是 'full' (全圖) 或 'results' (僅結果)。
     */
    async captureScreenshot(type = 'full') {
        let screenshotContainer = null; // 將容器宣告在 try 外層，以便 finally 可以存取
        try {
            this.showTempMessage('正在產生截圖...', 1500);

            let canvas;

            if (type === 'results') {
                // --- 僅截取結果的邏輯 ---
                const selectors = ['#results-section', '.detail-card', '.footer-note'];
                const elementsToCapture = selectors.map(s => document.querySelector(s)).filter(el => el !== null);

                if (elementsToCapture.length === 0) {
                    this.showTempMessage('沒有計算結果可供截圖！', 2000, 'error');
                    return;
                }

                // 建立一個暫時的、螢幕外的容器
                screenshotContainer = document.createElement('div');
                screenshotContainer.style.position = 'absolute';
                screenshotContainer.style.left = '-9999px';
                screenshotContainer.style.top = '0';
                screenshotContainer.style.padding = '20px';
                screenshotContainer.style.backgroundColor = '#f0f2f5'; // 模擬 body 背景色
                screenshotContainer.style.width = '500px'; // 模擬 .card 的寬度以保持排版

                // 將目標區塊的複製品加入容器
                elementsToCapture.forEach(el => {
                    screenshotContainer.appendChild(el.cloneNode(true));
                });

                // 將容器加入 DOM 以便 html2canvas 渲染
                document.body.appendChild(screenshotContainer);

                // 對暫時的容器進行截圖
                canvas = await html2canvas(screenshotContainer, {
                    allowTaint: true,
                    useCORS: true,
                    backgroundColor: null // 使用容器的背景色
                });

            } else {
                // --- 截取全圖的邏輯 (預設) ---
                const elementToCapture = document.getElementById('app');
                if (!elementToCapture) {
                    this.showTempMessage('找不到截圖目標！', 2000, 'error');
                    return;
                }

                canvas = await html2canvas(elementToCapture, {
                    allowTaint: true, // 允許跨域圖片污染 canvas
                    useCORS: true, // 使用 CORS 來加載跨域圖片
                    scrollY: -window.scrollY, // 確保從頁面頂部開始截圖
                    scrollX: 0,
                    windowWidth: document.documentElement.scrollWidth,
                    windowHeight: document.documentElement.scrollHeight,
                    onclone: (clonedDoc) => {
                        // 在複製的文檔中，找到所有懸浮按鈕內的圖示
                        const iconsInFabs = clonedDoc.querySelectorAll('.fab i.fa-solid');
                        iconsInFabs.forEach(icon => {
                            // 應用一個微調樣式，將圖示稍微向上移動以修正渲染偏差
                        icon.style.position = 'relative'; // 確保 top 屬性生效
                        icon.style.top = '-4px'; // 增加向上位移的量
                        });
                    }
                });
            }

            if (canvas) {
                // 產生下載連結
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ''); // YYYYMMDDhhmmss
                link.download = `費用分攤_${timestamp}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } catch (error) {
            console.error('截圖失敗:', error);
            this.showTempMessage('截圖失敗，請查看控制台錯誤。', 3000, 'error');
        } finally {
            // 無論成功或失敗，都從 DOM 中移除暫時的容器
            if (screenshotContainer) {
                document.body.removeChild(screenshotContainer);
            }
        }
    },

    /**
     * 切換懸浮功能選單的開關狀態，並控制頁面滾動條。
     */
    toggleFabMenu() {
        this.fabMenuOpen = !this.fabMenuOpen;
        if (this.fabMenuOpen) {
            document.body.classList.add('fab-open-no-scroll');
        } else {
            // 延遲移除 class，確保收合動畫完成後再恢復捲軸
            setTimeout(() => {
                document.body.classList.remove('fab-open-no-scroll');
            }, 300); // 延遲時間應與 CSS 中的 transition 時間 (0.3s) 匹配
        }
    },
};