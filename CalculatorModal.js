function round(val, digits = 12) {
    const p = 10 ** digits;
    return Math.round((val + Number.EPSILON) * p) / p;
}

export default {
    name: 'CalculatorModal',
    template: `
        <Transition name="modal">
            <div v-if="visible" class="calculator-modal">
                <div class="calculator">
                    <input type="text" v-model="input" readonly>
                    <div class="buttons">
                        <button v-for="n in [7,8,9,'+','C',4,5,6,'-','(',1,2,3,'*',')','.',0,'=','/','DEL']"
                                @touchstart="handleTouchStart($event, n)"
                                @touchend="handleTouchEnd($event, n)"
                                @touchmove="handleTouchMove($event)"
                                @click="press(n)"
                                :class="{'del-btn': n === 'DEL', 'clear-btn': n === 'C'}"
                                :key="n">
                            {{ n === 'DEL' ? '⌫' : n }}
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
        targetPath: String
    },
    emits: ['update:visible', 'update:value'],
    data() {
        return {
            input: '',
            error: '',
            lastCalculated: false,
            // 新增觸控事件相關的數據
            touchStartX: 0,
            touchStartY: 0,
            isMoving: false,
            touchThreshold: 5 // 定義輕微滑動的像素閾值，從 10 調整為 5，使其更靈敏
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
                this.input = this.initialValue;
                this.error = '';
                this.lastCalculated = true;
                document.body.classList.add('no-scroll');
            } else {
                document.body.classList.remove('no-scroll');
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
                this.press(key);
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
            } else if (key === 'NumpadAdd') { // 數字鍵盤 + 
                this.press('+');
                processed = true;
            } else if (key === 'NumpadSubtract') { // 數字鍵盤 - 
                this.press('-');
                processed = true;
            } else if (key === 'NumpadMultiply') { // 數字鍵盤 * 
                this.press('*');
                processed = true;
            } else if (key === 'NumpadDivide') { // 數字鍵盤 / 
                this.press('/');
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
        // 新增觸控事件處理函數
        handleTouchStart(event, val) {
            this.isMoving = false;
            if (event.touches.length > 0) {
                this.touchStartX = event.touches[0].clientX;
                this.touchStartY = event.touches[0].clientY;
            }
            // 阻止預設行為，以避免在按鈕上觸發瀏覽器自身的捲動
            event.preventDefault();
        },
        handleTouchMove(event) {
            if (event.touches.length > 0) {
                const deltaX = Math.abs(event.touches[0].clientX - this.touchStartX);
                const deltaY = Math.abs(event.touches[0].clientY - this.touchStartY);
                if (deltaX > this.touchThreshold || deltaY > this.touchThreshold) {
                    this.isMoving = true;
                }
            }
        },
        handleTouchEnd(event, val) {
            if (!this.isMoving) {
                // 只有在沒有明顯移動時才觸發 press
                this.press(val);
            }
            this.isMoving = false; // 重置狀態
        },
        press(val) {
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }

            if (val === '=') {
                this.tryEval();
                this.lastCalculated = true;
                if(this.error) {
                    return;
                }
            } else if (val === 'C') {
                this.input = '';
                this.error = '';
                this.lastCalculated = false;
            } else if (val === 'DEL') {
                this.input = this.input.slice(0, -1);
                this.error = '';
                this.lastCalculated = false;
            } else if (['+', '-', '*', '/'].includes(val)) {
                if (this.lastCalculated) {
                    this.input += val.toString();
                    this.lastCalculated = false;
                } else {
                    const lastChar = this.input.slice(-1);
                    if (['+', '-', '*', '/'].includes(lastChar)) {
                        this.input = this.input.slice(0, -1) + val.toString();
                    } else {
                        this.input += val.toString();
                    }
                }
                this.error = '';
            } else if (val === '(') {
                const lastChar = this.input.slice(-1);
                if (lastChar && (/[0-9)]/.test(lastChar))) {
                    this.input += '*(';
                } else {
                    this.input += '(';
                }
                this.error = '';
                this.lastCalculated = false;
            } else if (val === ')') {
                const openParenthesesCount = (this.input.match(/\(/g) || []).length;
                const closeParenthesesCount = (this.input.match(/\)/g) || []).length;
                if (openParenthesesCount > closeParenthesesCount) {
                    this.input += val.toString();
                    this.error = '';
                    this.lastCalculated = false;
                } else {
                    this.error = '算式錯誤';
                    return;
                }
            } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(val.toString()) || val === '.') { // 處理數字或小數點
                if (this.lastCalculated) {
                    this.input = (val === '.') ? '0.' : val.toString();
                    this.lastCalculated = false;
                } else {
                    this.input += val.toString(); // 先直接追加
                }
            }
            this.error = '';
            // 在所有輸入處理之後，進行正規化
            this.input = this.normalizeNumberInput(this.input);
        },
        normalizeNumberInput(inputString) {
            if (!inputString) return '';

            // 匹配數字、小數點或運算符/括號
            // 使用正則表達式捕獲每個數字/小數點序列或單個運算符/括號
            const tokens = inputString.match(/(\d+\.?\d*|\.?\d+|[+\-*\/()])/g);
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
            const inputToEvaluate = this.input;
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
                        this.input = result.toString();
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

            let value = this.input;
            if (value === '' || value === '錯誤') {
                value = 0;
            } else if (!/^-?\d+(\.\d+)?$/.test(value)) {
                this.error = '請先輸入正確算式';
                return;
            }
            this.$emit('update:value', { path: this.targetPath, value: Number(value) });
            this.$emit('update:visible', false);
        }
    }
};
