function round(val, digits = 12) {
    const p = 10 ** digits;
    return Math.round((val + Number.EPSILON) * p) / p;
}

// Vue.js 組件定義
export default {
    name: 'CalculatorModal',
    template: `
        <Transition name="modal">
            <div v-if="visible" class="calculator-modal">
                <div class="calculator">
                    <input type="text" v-model="displayInput" readonly>
                    <div :class="{ 'realtime-result': true, 'realtime-result-hidden': !realtimeResult }">{{ realtimeResult }}</div>
                    <div class="buttons">
                        <button v-for="n in [7,8,9,'+','C',4,5,6,'-','(',1,2,3,'X',')','.',0,'=','÷','DEL']"
                                @touchstart="handleTouchStart($event, n)"
                                @touchend="handleTouchEnd($event, n)"
                                @touchmove="handleTouchMove($event)"
                                @click="press(n)"
                                :class="{'del-btn': n === 'DEL', 'clear-btn': n === 'C'}"
                                :key="n">
                            {{ n === 'DEL' ? '⌫' : (n === 'X' ? '×' : (n === '÷' ? '÷' : n)) }}
                        </button>
                    </div>
                    <div v-if="error" class="error-tip">{{ error }}</div>
                    <div class="action-row">
                        <button @click="confirmAndClose">確定</button>
                        <button @click="handleCancel" class="action-btn">取消</button>
                    </div>
                </div>
            </div>
        </Transition>
    `,
    props: {
        visible: Boolean,
        initialValue: String,
        targetPath: String,
        formatNumberOrExpression: Function // 新增一個 prop 來接收格式化函數
    },
    emits: ['update:visible', 'update:value'], // 移除 tabPressed 事件
    data() {
        return {
            input: '',
            error: '',
            lastCalculated: false,
            realtimeResult: '',
            // 新增觸控事件相關的數據
            touchStartPos: { x: 0, y: 0 },
            touchStartTime: 0,
            touchThreshold: 15, // 定義輕微滑動的像素閾值，從 10 調整為 5，使其更靈敏
            maxDigits: 14 // 定義最大允許的位數
        };
    },
    mounted() {
        window.addEventListener('keydown', this.handleKeyDown);
    },
    unmounted() {
        window.removeEventListener('keydown', this.handleKeyDown);
    },
    watch: {
        visible(isVisible) {
            if (isVisible) {
                this.input = this.initialValue.toString(); // 確保 input 始終為字串
                this.error = '';
                this.lastCalculated = true;
                document.body.classList.add('no-scroll');
            } else {
                document.body.classList.remove('no-scroll');
                this.realtimeResult = ''; // 在計算機關閉時清空即時結果
            }
        }
    },
    methods: {
        handleCancel() {
            this.$emit('update:visible', false);
        },
        // 新增鍵盤事件處理函數
        handleKeyDown(event) {
            if (!this.visible) {
                return; // 計算機不可見時不處理鍵盤事件
            }

            const key = event.key;
            let processed = false;

            // 數字和運算符
            if (/[0-9]/.test(key)) {
                this.press(parseInt(key));
                processed = true;
            } else if (['+', '-', '*', '/', '.', '(', ')'].includes(key)) {
                let pressVal = key;
                if (key === '*') {
                    pressVal = 'X';
                } else if (key === '/') {
                    pressVal = '÷';
                }
                this.press(pressVal);
                processed = true;
            } else if (key === 'Enter') {
                // 檢查是否為單純數值
                if (/^-?\d+(\.\d+)?$/.test(this.input.trim())) {
                    this.confirmAndClose(); // 如果是單純數值，則直接確認並關閉
                } else {
                    this.press('='); // 否則，執行等於操作
                }
                processed = true;
            } else if (key === 'Backspace') {
                this.press('DEL');
                processed = true;
            } else if (key.toLowerCase() === 'c') {
                this.press('C');
                processed = true;
            } else if (key === 'Escape') { // 新增對 Escape 鍵的處理
                this.handleCancel();
                processed = true;
            } else if (key === 'Tab') { // 新增對 Tab 鍵的處理
                // event.preventDefault(); // 移除：讓瀏覽器處理 Tab 的預設行為
                // this.$emit('tabPressed', { shiftKey: event.shiftKey }); // 移除：不再發送事件
                this.handleCancel(); // 關閉計算機
                processed = false; // 不阻止預設行為
            } else if (key === 'NumpadAdd') { // 數字鍵盤 + 
                this.press('+');
                processed = true;
            } else if (key === 'NumpadSubtract') { // 數字鍵盤 - 
                this.press('-');
                processed = true;
            } else if (key === 'NumpadMultiply') { // 數字鍵盤 * 
                this.press('X');
                processed = true;
            } else if (key === 'NumpadDivide') { // 數字鍵盤 / 
                this.press('÷');
                processed = true;
            } else if (key === 'NumpadDecimal') { // 數字鍵盤 .
                this.press('.');
                processed = true;
            } else if (key === 'NumpadEnter') { // 數字鍵盤 Enter
                this.press('=');
                processed = true;
            }

            if (processed) {
                event.preventDefault(); // 阻止瀏覽器預設行為
            }
        },
        handleMouseDown(value) {
            // 處理滑鼠點擊事件，直接觸發 press 方法
            this.press(value);
        },

        handleTouchStart(event, value) {
            // 處理觸摸開始事件
            event.preventDefault(); // 阻止默認的觸摸行為，例如滾動或縮放
            this.touchStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            this.touchStartTime = Date.now();
            event.currentTarget.classList.add('touch-active'); // 添加 touch-active 類別
            this.press(value); // 在觸摸開始時就觸發按鈕點擊
        },

        handleTouchMove(event) {
            // 處理觸摸移動事件
            if (!this.touchStartPos.x || !this.touchStartPos.y) return;

            const currentX = event.touches[0].clientX;
            const currentY = event.touches[0].clientY;
            const diffX = Math.abs(currentX - this.touchStartPos.x);
            const diffY = Math.abs(currentY - this.touchStartPos.y);

            // 如果移動距離超過閾值，則判斷為滑動，取消點擊狀態
            if (diffX > this.touchThreshold || diffY > this.touchThreshold) {
                // 如果有 touch-active 類別，移除它
                if (event.currentTarget && event.currentTarget.classList.contains('touch-active')) {
                    event.currentTarget.classList.remove('touch-active');
                }
                this.touchStartPos = { x: 0, y: 0 }; // 重置觸摸起始位置
                this.touchStartTime = 0; // 重置觸摸開始時間
            }
        },

        handleTouchEnd(event, value) { // 接收 event 參數
            // 處理觸摸結束事件
            // 由於輸入已在 touchstart 處理，這裡僅重置狀態並移除 touch-active 類別
            if (event.currentTarget && event.currentTarget.classList.contains('touch-active')) {
                event.currentTarget.classList.remove('touch-active');
            }
            this.touchStartPos = { x: 0, y: 0 };
            this.touchStartTime = 0;
        },
        // 新增輔助方法來清除所有輸入和錯誤狀態
        clearAll() {
            this.input = '';
            this.error = '';
            this.lastCalculated = false;
            this.realtimeResult = '';
        },
        deleteLastInput() {
            this.input = this.input.slice(0, -1);
            this.error = '';
            this.lastCalculated = false;
            this.updateRealtimeResult(); // 修正：DEL 後更新即時結果
        },
        // 新增輔助方法來處理運算符輸入
        handleOperator(op) {
            const operator = (op === 'X' ? '*' : (op === '÷' ? '/' : op));
            if (this.lastCalculated) {
                const numVal = Number(this.input); // 確保是純數字
                this.input = numVal.toString() + operator;
                this.lastCalculated = false;
            } else {
                const lastChar = this.input.slice(-1);
                if (['+', '-', '*', '/'].includes(lastChar)) {
                    this.input = this.input.slice(0, -1) + operator;
                } else {
                    this.input += operator;
                }
            }
            this.error = '';
        },
        // 新增輔助方法來處理開括號輸入
        handleOpenParenthesis() {
            const lastChar = this.input.slice(-1);
            if (lastChar && (/[0-9)]/.test(lastChar))) {
                this.input += '*(';
            } else {
                this.input += '(';
            }
            this.error = '';
            this.lastCalculated = false;
        },
        // 新增輔助方法來處理閉括號輸入
        handleCloseParenthesis() {
            const openParenthesesCount = (this.input.match(/\(/g) || []).length;
            const closeParenthesesCount = (this.input.match(/\)/g) || []).length;
            if (openParenthesesCount > closeParenthesesCount) {
                this.input += ')';
                this.error = '';
                this.lastCalculated = false;
            } else {
                this.error = '算式錯誤';
                return true; // 表示有錯誤發生，需要阻止後續處理
            }
            return false; // 表示沒有錯誤
        },
        // 新增輔助方法來處理數字或小數點輸入
        handleNumberOrDecimal(digit) {
            if (this.lastCalculated) {
                this.input = (digit === '.') ? '0.' : digit;
                this.lastCalculated = false;
            } else {
                // 獲取當前正在編輯的數字部分 (已經移除了千位符號)
                const currentNumber = this.getCurrentNumberString();
                // 檢查新輸入是否會超過最大位數限制
                if (currentNumber.replace(/[^0-9]/g, '').length >= this.maxDigits && digit !== '.') {
                    this.error = `當前數字最多只能輸入 ${this.maxDigits} 位數`;
                    return true; // 表示有錯誤發生，需要阻止後續處理
                }
                // 如果是小數點，且當前輸入已經包含小數點，則不允許再次輸入
                if (digit === '.' && currentNumber.includes('.')) {
                    return true; // 表示有錯誤發生，需要阻止後續處理
                }
                this.input += digit; // 先直接追加，此時 input 已經是無千位符號的
            }
            return false; // 表示沒有錯誤
        },
        press(val) {
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }

            // 確保 val 始終為字串以便於比較
            const pressVal = val.toString(); 

            // 在所有輸入處理之後，進行正規化。在 switch 語句之前執行
            // this.input = this.normalizeNumberInput(this.input); // 移至每個邏輯的末尾

            switch (pressVal) {
                case '=':
                    this.tryEval();
                    this.lastCalculated = true;
                    if (this.error) {
                        return;
                    }
                    this.realtimeResult = ''; // 等於計算完成後清空即時結果
                    break;
                case 'C':
                    this.clearAll(); // 呼叫新的 clearAll 方法
                    break;
                case 'DEL':
                    this.deleteLastInput(); // 呼叫新的 deleteLastInput 方法
                    break;
                case '+':
                case '-':
                case 'X':
                case '÷':
                    this.handleOperator(pressVal); // 呼叫新的 handleOperator 方法
                    break;
                case '(':
                    this.handleOpenParenthesis(); // 呼叫新的 handleOpenParenthesis 方法
                    break;
                case ')':
                    if (this.handleCloseParenthesis()) { // 呼叫新的 handleCloseParenthesis 方法並檢查是否有錯誤
                        return;
                    }
                    break;
                case '.':
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    if (this.handleNumberOrDecimal(pressVal)) { // 呼叫新的 handleNumberOrDecimal 方法並檢查是否有錯誤
                        return;
                    }
                    break;
                default:
                    // 處理未知按鈕，例如防止不必要的錯誤或行為
                    this.error = '未知輸入';
                    return;
            }
            // 統一在此處處理錯誤清除，除非有特定錯誤發生
            if (this.error === '未知輸入') { // 只有當錯誤是未知輸入時才清除，避免清除其他有意義的錯誤
                this.error = '';
            }

            // 在所有輸入處理之後，進行正規化
            this.input = this.normalizeNumberInput(this.input);
            // 移除了在所有輸入處理之後無條件呼叫 updateRealtimeResult() 的程式碼
            // 統一在非等於運算後更新即時結果，並確保沒有錯誤
            if (pressVal !== '=' && pressVal !== 'C' && !this.error) { 
                this.updateRealtimeResult(); 
            }
        },
        normalizeNumberInput(inputString) {
            if (!inputString) return '';

            // 匹配數字、小數點或運算符/括號
            // 使用正則表達式捕獲每個數字/小數點序列或單個運算符/括號
            const tokens = inputString.match(/(-?\d+\.?\d*|[+\-*\/()])/g);
            if (!tokens) return '';

            let normalizedTokens = [];

            for (let i = 0; i < tokens.length; i++) {
                let token = tokens[i];

                if (/[+\-*\/()]/.test(token)) { // 運算符或括號
                    normalizedTokens.push(token);
                } else { // 數字部分
                    // 處理前導零
                    if (token.length > 1 && token.startsWith('0') && !token.startsWith('0.')) {
                        token = token.replace(/^0+/, ''); // 移除所有前導零
                        if (token === '') token = '0'; // 如果移除後為空，則設為'0'
                    }
                    
                    // 處理單獨的 '.'
                    if (token === '.') {
                        token = '0.';
                    }

                    // 確保沒有多個小數點 (只保留第一個)
                    const decimalParts = token.split('.');
                    if (decimalParts.length > 2) {
                        token = decimalParts[0] + '.' + decimalParts.slice(1).join('');
                    }
                    normalizedTokens.push(token);
                }
            }
            return normalizedTokens.join('');
        },
        tryEval() {
            this.error = '';
            const inputToEvaluate = this.input; // 在運算前移除千位符號
            console.log('tryEval: Evaluating expression:', inputToEvaluate);

            if (inputToEvaluate.trim() === '') {
                return;
            }

            try {
                if (/^[0-9+\-*/().\s]+$/.test(inputToEvaluate)) {
                    let result = eval(inputToEvaluate);
                    console.log('tryEval: Result:', result);
                    if(result === Infinity || result === -Infinity) {
                        console.log('tryEval: Result is Infinity or -Infinity');
                        this.error = '算式錯誤';
                        this.lastCalculated = false;
                        return;
                    }
                    // 檢查結果是否為浮點數
                    if (typeof result === 'number' && !Number.isInteger(result)) {
                        result = round(result, 10);
                    }
                    
                    if (typeof result === 'number' && isFinite(result)) {
                        const resultString = result.toString();
                        if (resultString.replace(/[^0-9]/g, '').length > this.maxDigits) {
                            this.error = `結果超過 ${this.maxDigits} 位數`;
                            this.lastCalculated = false;
                            return;
                        }
                        this.input = resultString; // 儲存無千位符號的結果
                    } else {
                        this.error = '算式錯誤';
                        this.lastCalculated = false;
                    }
                }

            } catch (e) {
                console.error('tryEval: Error during evaluation:', e.message);
                this.error = e.message === '除數不能為零' ? e.message : '算式錯誤';
                this.lastCalculated = false;
            }
        },
        confirmAndClose() {
            this.tryEval();

            if (this.error) {
                return;
            }

            let finalValue;
            if (this.input === '' || this.input === '錯誤') {
                finalValue = 0;
            } else {
                // 由於 this.input 在 tryEval 後已是純數字字串，可以直接轉換
                if (!/^-?\d+(\.\d+)?$/.test(this.input)) {
                    this.error = '請先輸入正確算式';
                    return;
                }
                finalValue = Number(this.input); // 直接轉換，因為 this.input 在 tryEval 後已是純數字字串
            }
            this.$emit('update:value', { path: this.targetPath, value: finalValue });
            this.$emit('update:visible', false);
            this.realtimeResult = ''; // 確定計算完成後清空即時結果
        },
        updateRealtimeResult() {
            if (this.input.trim() === '') {
                this.realtimeResult = '';
                return;
            }
            try {
                // 僅在輸入有效時嘗試評估，並清除可能的錯誤消息
                if (/^[0-9+\-*\/().\s]+$/.test(this.input)) { // eval 前移除千位符號
                    let tempResult = eval(this.input); // eval 前移除千位符號
                    if (typeof tempResult === 'number' && isFinite(tempResult)) {
                        // 對結果進行四捨五入，最多保留10位小數
                        const realtimeResultString = round(tempResult, 10).toString();
                        if (realtimeResultString.replace(/[^0-9]/g, '').length > this.maxDigits) {
                            this.realtimeResult = ''; // 結果超過位數限制時清空
                        } else {
                            this.realtimeResult = this.formatNumberOrExpression(realtimeResultString); // 格式化即時結果
                        }
                    } else {
                        this.realtimeResult = ''; // 非法結果清空
                    }
                } else {
                    this.realtimeResult = ''; // 非法輸入清空
                }
            } catch (e) {
                this.realtimeResult = ''; // 運算錯誤清空
            }
        },
        getCurrentNumberString() {
            // 從輸入字串中提取最後一個數字或小數點之前的所有內容
            const lastNumberMatch = this.input.match(/(-?\d+\.?\d*)$/);
            return lastNumberMatch ? lastNumberMatch[0] : '';
        }
    },
    computed: {
        displayInput() {
            let processedInput = this.input.replace(/\*/g, '×').replace(/\//g, '÷');
            // 使用正規表達式匹配數字（包括負數和小數）
            processedInput = processedInput.replace(/(-?\d+\.?\d*)/g, (match) => {
                // 只對數字部分進行格式化，並確保傳入的是數字類型
                return this.formatNumberOrExpression(Number(match));
            });
            return processedInput;
        }
    }
};
