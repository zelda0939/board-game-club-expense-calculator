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
};