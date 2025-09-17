import calculationHelpers from '../calculationHelpers.js';

QUnit.module('calculationHelpers', hooks => {
    QUnit.test('calculateMemberTotal - 基本數字計算', function(assert) {
        const memberExpenses = {
            meal: [{
                amount: '100',
                note: '午餐'
            }, {
                amount: '50',
                note: '飲料'
            }],
            transport: '200',
            printer_3d: '30'
        };
        const result = calculationHelpers.calculateMemberTotal(memberExpenses);
        assert.equal(result, 380, '應正確計算所有費用的總和');
    });

    QUnit.test('calculateMemberTotal - 包含千位分隔符號的數字', function(assert) {
        const memberExpenses = {
            meal: [{
                amount: '1,000',
                note: '晚餐'
            }, {
                amount: '200',
                note: '點心'
            }],
            transport: '1,500',
            printer_3d: '500'
        };
        const result = calculationHelpers.calculateMemberTotal(memberExpenses);
        assert.equal(result, 3200, '應正確處理帶有千位分隔符號的數字');
    });

    QUnit.test('calculateMemberTotal - 包含小數的數字', function(assert) {
        const memberExpenses = {
            meal: [{
                amount: '100.50',
                note: '咖啡'
            }],
            transport: '20.25',
            printer_3d: '5.25'
        };
        const result = calculationHelpers.calculateMemberTotal(memberExpenses);
        assert.equal(result, 126, '應正確處理帶有小數的數字並四捨五入');
    });

    QUnit.test('calculateMemberTotal - 包含零或空字串的數字', function(assert) {
        const memberExpenses = {
            meal: [{
                amount: '0',
                note: '零花費'
            }, {
                amount: '',
                note: '空字串花費'
            }],
            transport: '0',
            printer_3d: ''
        };
        const result = calculationHelpers.calculateMemberTotal(memberExpenses);
        assert.equal(result, 0, '應正確處理零或空字串的數字');
    });

    QUnit.test('calculateMemberTotal - 只有餐費', function(assert) {
        const memberExpenses = {
            meal: [{
                amount: '150',
                note: '早餐'
            }],
            transport: '0',
            printer_3d: '0'
        };
        const result = calculationHelpers.calculateMemberTotal(memberExpenses);
        assert.equal(result, 150, '應正確計算只有餐費的情況');
    });

    QUnit.test('calculateMemberTotal - 沒有餐費', function(assert) {
        const memberExpenses = {
            meal: [],
            transport: '100',
            printer_3d: '50'
        };
        const result = calculationHelpers.calculateMemberTotal(memberExpenses);
        assert.equal(result, 150, '應正確計算沒有餐費的情況');
    });

    QUnit.test('calculateMemberTotal - 混合有效和無效的費用', function(assert) {
        const memberExpenses = {
            meal: [{
                amount: 'abc',
                note: '無效金額'
            }, {
                amount: '200',
                note: '有效金額'
            }],
            transport: 'xyz',
            printer_3d: '50'
        };
        const result = calculationHelpers.calculateMemberTotal(memberExpenses);
        // Number('abc') 和 Number('xyz') 會是 NaN，在計算時會被視為 0
        assert.equal(result, 250, '應忽略無效數字並計算有效數字');
    });
});
