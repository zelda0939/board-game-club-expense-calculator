/**
 * @file scrollUtils.js
 * @description 提供滾動到指定元素的通用工具函式。
 */

/**
 * 尋找指定元素最近的可滾動父容器。
 * @param {HTMLElement} el - 起始元素。
 * @returns {HTMLElement|null} - 可滾動的容器元素，如果找不到則返回 null。
 */
function findScrollContainer(el) {
    let cur = el.parentElement;
    while (cur) {
        const style = window.getComputedStyle(cur);
        const overflowY = style.overflowY;
        const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight;
        if (isScrollable) return cur;
        cur = cur.parentElement;
    }
    return null;
}

/**
 * 將畫面平滑滾動到指定的元素，使其在可滾動容器或視窗中置中。
 * @param {HTMLElement} element - 要滾動到的目標元素。
 */
export function scrollToElement(element) {
    if (!element) return;

    const scrollContainer = findScrollContainer(element);

    if (scrollContainer) {
        // 如果在可滾動容器內，計算位移並滾動
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const offset = (elementRect.top - containerRect.top) + (elementRect.height / 2) - (containerRect.height / 2);
        const targetScroll = Math.max(0, scrollContainer.scrollTop + offset);
        scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
    } else {
        // 否則，使用標準的 scrollIntoView
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 提供一個備援的全局滾動，確保在某些複雜佈局下也能置中
    // 使用 setTimeout 確保在主滾動動畫開始後再執行
    setTimeout(() => {
        try {
            const rect = element.getBoundingClientRect();
            const absoluteTop = rect.top + window.pageYOffset - (window.innerHeight / 2);
            window.scrollTo({ top: absoluteTop, behavior: 'smooth' });
        } catch (e) {
            // 忽略可能發生的錯誤
        }
    }, 120);
}