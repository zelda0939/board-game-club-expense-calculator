import dataPersistence, { initialData } from '../dataPersistence.js';
import { getSettings, saveSettings } from '../settings.js';

QUnit.module('dataPersistence', hooks => {
    let vm; // 模擬 Vue 實例

    hooks.beforeEach(() => {
        // 在每次測試前清除 localStorage
        localStorage.clear();

        // 模擬 Vue 實例
        vm = {
            $data: JSON.parse(JSON.stringify(initialData)),
            savedEntries: [],
            selectedSaveEntry: '',
            loadMessage: '',
            customModal: { visible: false, title: '', message: '', type: 'confirm' },
            tempMessageModal: { visible: false, message: '' },
            pendingSaveEntry: '',
            dateChangeModal: { visible: false, originalDate: '', newDate: '', },
            overwriteConfirmModal: { visible: false, originalDate: '', newDate: '', message: '' },
            confirmationModal: { visible: false, message: '', onConfirm: null },
            user: null,
            isSyncing: false,
            enableAutoBackup: false,
            loginModalVisible: false,
            loginEmail: '',
            loginPassword: '',
            loginError: '',
            rememberMe: false,
            showTempMessage: function(message) {
                this.tempMessageModal.message = message;
                this.tempMessageModal.visible = true;
            },
            showOverwriteConfirm: sinon.stub().callsFake(function(originalDate, newDate) {
                this.overwriteConfirmModal.visible = true;
                this.overwriteConfirmModal.originalDate = originalDate;
                this.overwriteConfirmModal.newDate = newDate;
                this.overwriteConfirmModal.message = `日期 ${newDate} 已有數據，是否覆蓋？`;
            }),
        };

        vm.reimbursable = vm.$data.reimbursable;
        vm.our_own = vm.$data.our_own;

        // 將 dataPersistence 的方法綁定到模擬的 vm 上
        for (const key in dataPersistence) {
            if (Object.hasOwnProperty.call(dataPersistence, key) && typeof dataPersistence[key] === 'function') {
                vm[key] = dataPersistence[key].bind(vm);
            }
        }
    });

    hooks.afterEach(() => {
        localStorage.clear();
    });

    QUnit.test('initialData 應具有正確的結構', function(assert) {
        assert.deepEqual(initialData.reimbursable.me.meal, [{
            amount: 0,
            note: ''
        }], 'reimbursable.me.meal 應為包含單一空餐費項目的陣列');
        assert.equal(initialData.reimbursable.me.transport, 0, 'reimbursable.me.transport 應為 0');
        assert.deepEqual(initialData.our_own.wife.meal, [{
            amount: 0,
            note: ''
        }], 'our_own.wife.meal 應為包含單一空餐費項目的陣列');
    });

    QUnit.test('assignSavedData - 基本數據載入', function(assert) {
        const targetObj = JSON.parse(JSON.stringify(initialData.reimbursable));
        const sourceObj = {
            me: {
                meal: [{
                    amount: '100',
                    note: 'Test Meal'
                }],
                transport: '50'
            },
            wife: {
                meal: [{
                    amount: '200',
                    note: 'Wife Meal'
                }],
                transport: '75'
            },
            brother: {
                meal: [{
                    amount: '300',
                    note: 'Brother Meal'
                }],
                transport: '25',
                printer_3d: '10'
            }
        };
        vm.assignSavedData(targetObj, sourceObj);

        assert.equal(targetObj.me.meal[0].amount, 100, '應正確載入 Zelda 餐費金額');
        assert.equal(targetObj.me.meal[0].note, 'Test Meal', '應正確載入 Zelda 餐費備註');
        assert.equal(targetObj.me.transport, 50, '應正確載入 Zelda 車費');
        assert.equal(targetObj.wife.meal[0].amount, 200, '應正確載入 Emma 餐費金額');
        assert.equal(targetObj.brother.printer_3d, 10, '應正確載入 Andrew 3D 列印費用');
    });

    QUnit.test('assignSavedData - 處理舊版單一餐費數據', function(assert) {
        const targetObj = JSON.parse(JSON.stringify(initialData.reimbursable));
        const sourceObj = {
            me: {
                meal: 150, // 舊版單一數字格式
                transport: 50
            }
        };
        vm.assignSavedData(targetObj, sourceObj);

        assert.deepEqual(targetObj.me.meal, [{
            amount: 150,
            note: ''
        }], '舊版單一餐費數據應轉換為陣列格式');
        assert.equal(targetObj.me.transport, 50, '其他數據應不受影響');
    });

    QUnit.test('assignSavedData - 處理缺失數據', function(assert) {
        const targetObj = JSON.parse(JSON.stringify(initialData.reimbursable));
        const sourceObj = {
            me: {
                transport: '50'
            } // 缺少 meal 字段
        };
        vm.assignSavedData(targetObj, sourceObj);

        assert.deepEqual(targetObj.me.meal, [{
            amount: 0,
            note: ''
        }], '缺失的 meal 字段應被初始化為空餐費陣列');
        assert.equal(targetObj.me.transport, 50, '現有數據應被載入');
    });

    QUnit.test('assignSavedData - 處理空對象', function(assert) {
        const targetObj = JSON.parse(JSON.stringify(initialData.reimbursable));
        const sourceObj = {};
        vm.assignSavedData(targetObj, sourceObj);

        assert.deepEqual(targetObj.me.meal, [{
            amount: 0,
            note: ''
        }], '空源對象應導致所有字段初始化為預設值');
        assert.equal(targetObj.me.transport, 0, '空源對象應導致 transport 初始化為 0');
    });

    QUnit.test('clearInputs - 清空輸入並更新 settings', function(assert) {
        vm.$data.reimbursable.me.meal = [{ amount: 100, note: 'test' }];
        const settings = getSettings();
        settings.currentData = { reimbursable: vm.$data.reimbursable, our_own: vm.$data.our_own };
        saveSettings(settings);

        vm.clearInputs();

        assert.deepEqual(vm.$data.reimbursable, initialData.reimbursable, 'reimbursable 應被重置為初始數據');
        const newSettings = getSettings();
        assert.equal(newSettings.currentData, null, 'settings 中的 currentData 應被設為 null');
    });

    QUnit.test('saveCurrentData - 新增數據', function(assert) {
        const today = new Date().toISOString().slice(0, 10);
        vm.$data.reimbursable.me.meal = [{ amount: 100, note: 'test' }];
        vm.saveCurrentData();

        const settings = getSettings();
        assert.equal(settings.savedEntries.length, 1, 'savedEntries 應包含一條數據');
        assert.equal(settings.savedEntries[0].date, today, '數據日期應為今天');
        assert.equal(settings.savedEntries[0].reimbursable.me.meal[0].amount, 100, '數據內容應正確保存');
        assert.equal(vm.tempMessageModal.message, `保存成功：${today}。`, '應顯示保存成功訊息');
    });

    QUnit.test('saveCurrentData - 更新現有數據', function(assert) {
        const today = new Date().toISOString().slice(0, 10);
        vm.$data.reimbursable.me.meal = [{ amount: 100, note: 'first save' }];
        vm.saveCurrentData();

        vm.$data.reimbursable.me.meal = [{ amount: 200, note: 'second save' }];
        vm.saveCurrentData();

        const settings = getSettings();
        assert.equal(settings.savedEntries.length, 1, 'savedEntries 應仍然只有一條數據');
        assert.equal(settings.savedEntries[0].reimbursable.me.meal[0].amount, 200, '數據內容應被更新');
        assert.equal(vm.tempMessageModal.message, `數據已更新至 ${today}。`, '應顯示更新成功訊息');
    });

    QUnit.test('saveCurrentData - 超過 20 筆數據應移除最舊的', function(assert) {
        // 填充 20 筆數據
        let settings = getSettings();
        for (let i = 0; i < 20; i++) {
            settings.savedEntries.push({
                date: `2025-01-${(i + 1).toString().padStart(2, '0')}`,
                reimbursable: { me: { meal: [{ amount: i, note: '' }] } },
                our_own: {}
            });
        }
        saveSettings(settings);
        vm.savedEntries = settings.savedEntries; // 同步 vm 的 savedEntries

        const today = new Date().toISOString().slice(0, 10);
        vm.$data.reimbursable.me.meal = [{ amount: 999, note: 'new entry' }];
        vm.saveCurrentData(); // 新增第 21 筆數據

        settings = getSettings(); // 重新獲取更新後的 settings
        assert.equal(settings.savedEntries.length, 20, 'savedEntries 應保持 20 筆數據');
        assert.equal(settings.savedEntries[0].date, '2025-01-02', '最舊的數據 (2025-01-01) 應被移除');
        assert.equal(settings.savedEntries[19].date, today, '最新數據應被添加');
        assert.equal(settings.savedEntries[19].reimbursable.me.meal[0].amount, 999, '最新數據內容應正確');
    });

    QUnit.test('handleSaveEntrySelection - 顯示確認模態框', function(assert) {
        vm.selectedSaveEntry = '2025-01-15';
        vm.handleSaveEntrySelection();

        assert.true(vm.customModal.visible, '模態框應可見');
        assert.equal(vm.customModal.title, '操作確認', '模態框標題應正確');
        assert.equal(vm.customModal.message, '您想對 2025-01-15 的數據執行什麼操作？', '模態框訊息應正確');
        assert.equal(vm.customModal.type, 'confirm', '模態框類型應為 confirm');
        assert.equal(vm.pendingSaveEntry, '2025-01-15', 'pendingSaveEntry 應暫存選定的日期');
    });

    QUnit.test('loadDataByDate - 載入指定日期的數據', function(assert) {
        const testData = {
            date: '2025-02-01',
            reimbursable: { me: { meal: [{ amount: 123, note: 'Load Test' }] } },
            our_own: {}
        };
        let settings = getSettings();
        settings.savedEntries = [testData];
        saveSettings(settings);
        vm.savedEntries = settings.savedEntries; // 同步 vm 的 savedEntries

        vm.loadDataByDate('2025-02-01');

        assert.equal(vm.$data.reimbursable.me.meal[0].amount, 123, '數據應被正確載入');
        assert.equal(vm.tempMessageModal.message, '已載入 2025-02-01 數據。', '應顯示載入成功訊息');
    });

    QUnit.test('loadDataByDate - 未找到數據', function(assert) {
        let settings = getSettings();
        settings.savedEntries = [];
        saveSettings(settings);
        vm.savedEntries = settings.savedEntries; // 同步 vm 的 savedEntries

        vm.loadDataByDate('2025-02-01');

        assert.equal(vm.tempMessageModal.message, '未找到數據。', '應顯示未找到數據訊息');
    });

    QUnit.test('deleteDataByDate - 刪除指定日期的數據', function(assert) {
        const testData1 = { date: '2025-02-01', reimbursable: {}, our_own: {} };
        const testData2 = { date: '2025-02-02', reimbursable: {}, our_own: {} };
        let settings = getSettings();
        settings.savedEntries = [testData1, testData2];
        saveSettings(settings);
        vm.savedEntries = settings.savedEntries; // 同步 vm 的 savedEntries

        vm.deleteDataByDate('2025-02-01');

        settings = getSettings(); // 重新獲取更新後的 settings
        assert.equal(vm.savedEntries.length, 1, 'vm.savedEntries 應減少一條');
        assert.equal(settings.savedEntries.length, 1, 'settings.savedEntries 應減少一條');
        assert.equal(settings.savedEntries[0].date, '2025-02-02', '應刪除正確的數據');
        assert.equal(vm.tempMessageModal.message, '已刪除 2025-02-01 數據。', '應顯示刪除成功訊息');
    });

    QUnit.test('deleteDataByDate - 未找到數據可刪除', function(assert) {
        let settings = getSettings();
        settings.savedEntries = [{ date: '2025-02-02', reimbursable: {}, our_own: {} }];
        saveSettings(settings);
        vm.savedEntries = settings.savedEntries; // 同步 vm 的 savedEntries

        vm.deleteDataByDate('2025-02-01');

        settings = getSettings(); // 重新獲取更新後的 settings
        assert.equal(vm.savedEntries.length, 1, 'vm.savedEntries 長度應不變');
        assert.equal(settings.savedEntries.length, 1, 'settings.savedEntries 長度應不變');
        assert.equal(vm.tempMessageModal.message, '未找到數據可刪除。', '應顯示未找到數據訊息');
    });

    QUnit.test('updateEntryDate - 成功修改日期 (無衝突)', function(assert) {
        const originalDate = '2025-03-01';
        const newDate = '2025-03-05';
        vm.savedEntries = [{
            date: originalDate,
            reimbursable: { me: { meal: [{ amount: 100, note: '' }] } },
            our_own: {}
        }];
        localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(vm.savedEntries));

        vm.updateEntryDate(originalDate, newDate);

        assert.equal(vm.savedEntries.length, 1, '數據數量應不變');
        assert.equal(vm.savedEntries[0].date, newDate, '數據日期應被更新');
        assert.equal(vm.tempMessageModal.message, `數據日期已從 ${originalDate} 更新為 ${newDate}。`, '應顯示更新成功訊息');
    });

    QUnit.test('updateEntryDate - 原始數據不存在', function(assert) {
        const originalDate = '2025-03-01';
        const newDate = '2025-03-05';
        vm.savedEntries = [];
        localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(vm.savedEntries));

        vm.updateEntryDate(originalDate, newDate);

        assert.equal(vm.tempMessageModal.message, '未找到原始數據可更新日期。', '應顯示錯誤訊息');
    });

    QUnit.test('updateEntryDate - 日期未更改', function(assert) {
        const originalDate = '2025-03-01';
        const newDate = '2025-03-01';
        vm.savedEntries = [{
            date: originalDate,
            reimbursable: { me: { meal: [{ amount: 100, note: '' }] } },
            our_own: {}
        }];
        localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(vm.savedEntries));

        vm.updateEntryDate(originalDate, newDate);

        assert.equal(vm.tempMessageModal.message, '日期未更改。', '應顯示日期未更改訊息');
    });

    QUnit.test('updateEntryDate - 觸發覆蓋確認 (新日期已存在)', function(assert) {
        const originalDate = '2025-03-01';
        const newDate = '2025-03-02';
        vm.savedEntries = [{
            date: originalDate,
            reimbursable: { me: { meal: [{ amount: 100, note: '' }] } },
            our_own: {}
        }, {
            date: newDate,
            reimbursable: { me: { meal: [{ amount: 200, note: '' }] } },
            our_own: {}
        }];
        localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(vm.savedEntries));

        vm.updateEntryDate(originalDate, newDate);

        assert.true(vm.overwriteConfirmModal.visible, '應顯示覆蓋確認模態框');
        assert.equal(vm.overwriteConfirmModal.originalDate, originalDate, '覆蓋確認模態框應顯示原始日期');
        assert.equal(vm.overwriteConfirmModal.newDate, newDate, '覆蓋確認模態框應顯示新日期');
        assert.equal(vm.overwriteConfirmModal.message, `日期 ${newDate} 已有數據，是否覆蓋？`, '覆蓋確認模態框訊息應正確');
    });

    QUnit.test('updateEntryDate - 執行覆蓋操作', function(assert) {
        const originalDate = '2025-03-01';
        const newDate = '2025-03-02';
        const originalData = { date: originalDate, reimbursable: { me: { meal: [{ amount: 100, note: 'Original' }] } }, our_own: {} };
        const newData = { date: newDate, reimbursable: { me: { meal: [{ amount: 200, note: 'Existing' }] } }, our_own: {} };
        vm.savedEntries = [originalData, newData];
        localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(vm.savedEntries));

        vm.updateEntryDate(originalDate, newDate, true); // 設置 overwrite 為 true

        assert.equal(vm.savedEntries.length, 1, '數據數量應變為 1');
        assert.equal(vm.savedEntries[0].date, newDate, '剩餘數據的日期應為新日期');
        assert.equal(vm.savedEntries[0].reimbursable.me.meal[0].amount, 100, '應是原始數據的內容被移動到新日期');
        assert.equal(vm.tempMessageModal.message, '覆蓋成功。', '應顯示覆蓋成功訊息');
    });

    QUnit.test('loadSavedEntries - 載入 settings 中的數據', function(assert) {
        const testEntries = [{ date: '2025-04-01', reimbursable: {}, our_own: {} }];
        saveSettings({ savedEntries: testEntries });

        vm.loadSavedEntries();

        assert.deepEqual(vm.savedEntries, testEntries, 'savedEntries 應與 settings 中的數據一致');
    });

    QUnit.test('loadSavedEntries - settings 中沒有數據', function(assert) {
        saveSettings({ savedEntries: [] }); // 確保 settings 中 savedEntries 為空

        vm.loadSavedEntries();

        assert.deepEqual(vm.savedEntries, [], 'savedEntries 應為空陣列');
        assert.equal(vm.selectedSaveEntry, '', 'selectedSaveEntry 應為空');
    });
});
