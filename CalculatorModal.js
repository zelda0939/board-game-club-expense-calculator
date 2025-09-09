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
                this.lastCalculated = false;
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
            } else { // 數字或小數點
                if (this.lastCalculated) {
                    this.input = val.toString();
                    this.lastCalculated = false;
                } else {
                    this.input += val.toString();
                }
                this.error = '';
            }
        },
        tryEval() {
            this.error = '';
            const inputToEvaluate = this.input;

            if (inputToEvaluate.trim() === '') {
                return;
            }

            try {
                if (/^[0-9+\-*/().\s]+$/.test(inputToEvaluate)) {
                    const result = eval(inputToEvaluate);
                    if (typeof result === 'number' && isFinite(result)) {
                        this.input = result.toString();
                    } else {
                        this.error = '算式錯誤';
                        this.lastCalculated = false;
                    }
                } else {
                    this.error = '算式錯誤';
                    this.lastCalculated = false;
                }
            } catch (e) {
                this.error = '算式錯誤';
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
