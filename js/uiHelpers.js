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
     * 截取整個 #app 元素的畫面並觸發下載。
     */
    async captureScreenshot() {
        try {
            this.showTempMessage('正在產生截圖...', 1500);
            const elementToCapture = document.getElementById('app');
            if (!elementToCapture) {
                this.showTempMessage('找不到截圖目標！', 2000, 'error');
                return;
            }

            const canvas = await html2canvas(elementToCapture, {
                allowTaint: true, // 允許跨域圖片污染 canvas
                useCORS: true,    // 使用 CORS 來加載跨域圖片
                scrollY: -window.scrollY, // 確保從頁面頂部開始截圖
                scrollX: 0,
                windowWidth: elementToCapture.scrollWidth,
                windowHeight: elementToCapture.scrollHeight
            });

            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ''); // YYYYMMDDhhmmss
            link.download = `費用分攤_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('截圖失敗:', error);
            this.showTempMessage('截圖失敗，請查看控制台錯誤。', 3000, 'error');
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