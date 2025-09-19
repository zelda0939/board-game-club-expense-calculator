import CalculatorModal from '../CalculatorModal.js';

QUnit.module('CalculatorModal.evaluateExpression', hooks => {
    QUnit.test('basic arithmetic', function(assert) {
        const result = CalculatorModal.methods.evaluateExpression('12+3*2');
        assert.equal(result, 18, '12+3*2 應為 18');
    });

    QUnit.test('decimal and parentheses', function(assert) {
        const expr = '(1.5+2.25)*4';
        const result = CalculatorModal.methods.evaluateExpression(expr);
        const expected = (1.5 + 2.25) * 4;
        assert.ok(Math.abs(result - expected) < 1e-9, `${expr} 應為 ${expected}`);
    });

    QUnit.test('leading decimal', function(assert) {
        const result = CalculatorModal.methods.evaluateExpression('.5+1');
        assert.ok(Math.abs(result - 1.5) < 1e-9, ' .5+1 應為 1.5');
    });

    QUnit.test('division by zero returns NaN', function(assert) {
        const result = CalculatorModal.methods.evaluateExpression('1/0');
        assert.ok(Number.isNaN(result), '1/0 應回傳 NaN（視為錯誤）');
    });

    QUnit.test('invalid characters rejected', function(assert) {
        const result = CalculatorModal.methods.evaluateExpression('alert(1)');
        assert.ok(Number.isNaN(result), '含有非法字元的輸入應回傳 NaN');
    });

    QUnit.test('mismatched parentheses returns NaN', function(assert) {
        const result = CalculatorModal.methods.evaluateExpression('((1+2)');
        assert.ok(Number.isNaN(result), '括號不匹配應回傳 NaN');
    });
});
