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

QUnit.module('CalculatorModal.evaluateExpression - 進階與邊界測試', hooks => {
    QUnit.test('多重括號與嵌套', function(assert) {
        assert.equal(CalculatorModal.methods.evaluateExpression('((2+3)*4)-5'), 15, '((2+3)*4)-5 應為 15');
        assert.equal(CalculatorModal.methods.evaluateExpression('(1+(2*3+(4/2)))'), 9, '(1+(2*3+(4/2))) 應為 9');
    });
    QUnit.test('負數與正負號混用', function(assert) {
        assert.equal(CalculatorModal.methods.evaluateExpression('-3+5'), 2, '-3+5 應為 2');
        assert.equal(CalculatorModal.methods.evaluateExpression('4*-2'), -8, '4*-2 應為 -8');
        assert.equal(CalculatorModal.methods.evaluateExpression('-(-5)'), 5, '-(-5) 應為 5');
    });
    QUnit.test('連續運算子或錯誤格式', function(assert) {
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('1++2')), '1++2 應回傳 NaN');
        assert.equal(CalculatorModal.methods.evaluateExpression('3--2'), 5, '3--2 應為 5');
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('2..3+1')), '2..3+1 應回傳 NaN');
    });
    QUnit.test('空字串或僅空白', function(assert) {
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('')), '空字串應回傳 NaN');
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('   ')), '僅空白應回傳 NaN');
    });
    QUnit.test('極大或極小數值', function(assert) {
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('1e3+1')), '1e3+1 應回傳 NaN（不支援 e 記號）');
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('1e10+1')), '1e10+1 應回傳 NaN（不支援 e 記號）');
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('1/1e-10')), '1/1e-10 應回傳 NaN（不支援 e 記號）');
    });
    QUnit.test('僅單一數字或小數', function(assert) {
        assert.equal(CalculatorModal.methods.evaluateExpression('5'), 5, '5 應為 5');
        assert.equal(CalculatorModal.methods.evaluateExpression('0.75'), 0.75, '0.75 應為 0.75');
    });
    QUnit.test('運算子前後空白', function(assert) {
        assert.equal(CalculatorModal.methods.evaluateExpression(' 1 + 2 '), 3, ' 1 + 2  應為 3');
        assert.equal(CalculatorModal.methods.evaluateExpression('3* 4'), 12, '3* 4 應為 12');
    });
    QUnit.test('非法但常見輸入', function(assert) {
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('1/')), '1/ 應回傳 NaN');
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('*2+3')), '*2+3 應回傳 NaN');
        assert.ok(Number.isNaN(CalculatorModal.methods.evaluateExpression('(2+3))')), '(2+3)) 應回傳 NaN');
    });
    QUnit.test('浮點誤差邊界', function(assert) {
        const result = CalculatorModal.methods.evaluateExpression('0.1+0.2');
        assert.ok(Math.abs(result - 0.3) < 1e-9, '0.1+0.2 應接近 0.3');
    });
});

QUnit.module('CalculatorModal._formatDisplayValue', hooks => {
    // Mock component context for the method
    const mockThis = {
        useThousandSeparator: true
    };

    QUnit.test('integer formatting', function(assert) {
        const formatted = CalculatorModal.methods._formatDisplayValue.call(mockThis, '12345');
        assert.equal(formatted, '12,345', 'Should format integer with thousand separators.');
    });

    QUnit.test('decimal number formatting', function(assert) {
        const formatted = CalculatorModal.methods._formatDisplayValue.call(mockThis, '12345.678');
        assert.equal(formatted, '12,345.678', 'Should format decimal number with thousand separators.');
    });

    QUnit.test('number with trailing decimal point', function(assert) {
        const formatted = CalculatorModal.methods._formatDisplayValue.call(mockThis, '12345.');
        assert.equal(formatted, '12,345.', 'Should format number and preserve trailing decimal point.');
    });

    QUnit.test('expression with multiple numbers', function(assert) {
        const formatted = CalculatorModal.methods._formatDisplayValue.call(mockThis, '1234.5+67890');
        assert.equal(formatted, '1,234.5+67,890', 'Should format all numbers in an expression.');
    });

    QUnit.test('negative number formatting', function(assert) {
        const formatted = CalculatorModal.methods._formatDisplayValue.call(mockThis, '-12345.67');
        assert.equal(formatted, '-12,345.67', 'Should correctly format negative numbers.');
    });

    QUnit.test('number that does not need a separator', function(assert) {
        const formatted = CalculatorModal.methods._formatDisplayValue.call(mockThis, '123.45');
        assert.equal(formatted, '123.45', 'Should not add separator to numbers less than 1000.');
    });

    QUnit.test('negative number below 1000', function(assert) {
        const formatted = CalculatorModal.methods._formatDisplayValue.call(mockThis, '-100');
        assert.equal(formatted, '-100', 'Should correctly format negative numbers below 1000 without separator.');
    });
});
