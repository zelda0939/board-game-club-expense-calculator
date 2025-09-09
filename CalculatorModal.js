function round(val, digits = 12) {
    const p = 10 ** digits;
    return Math.round((val + Number.EPSILON) * p) / p;
}

export default {
    name: 'CalculatorModal',
    template: `
        <div v-if="visible" class="calculator-modal">
            <div class="calculator">
                <input type="text" v-model="input" readonly>
                <div class="buttons">
                    <button v-for="n in [7,8,9,'+','C',4,5,6,'-','(',1,2,3,'*',')','.',0,'=','/','DEL']"
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
            lastCalculated: false
        };
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
                this.input += val.toString();
                this.error = '';
                this.lastCalculated = false;
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
