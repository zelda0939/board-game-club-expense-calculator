import firebaseHelpers from '../firebaseHelpers.js';
import { initialData } from '../dataPersistence.js';

// 模擬 firebaseAuth 模組
const mockFirebaseAuth = {
    signOutUser: QUnit.stub(),
    uploadUserData: QUnit.stub(),
    downloadUserData: QUnit.stub(),
};

// 替換模組中的導入
// 注意：在真實的 ES 模組環境中，直接替換導入會比較困難，
// 通常會使用依賴注入或測試工具的特殊功能。
// 這裡我們假設可以通過某種方式（例如在測試環境中覆蓋模組）來實現。
// 對於簡單的 QUnit 測試，我們可以直接在 beforeEach 中將模擬函數設置到 vm 中，
// 讓 firebaseHelpers 模組通過 this 訪問這些模擬函數。
// 或者，如果 firebaseHelpers 是直接導入這些函數並使用，那麼需要更精細的模擬方法。
// 為了簡化，我們將模擬函數直接作為 vm 的屬性，並假設 firebaseHelpers 內部會通過 this 訪問它們。

QUnit.module('firebaseHelpers', hooks => {
    let vm;
    let originalLocalStorage;

    hooks.beforeEach(() => {
        // 恢復所有 stub
        mockFirebaseAuth.signOutUser.reset();
        mockFirebaseAuth.uploadUserData.reset();
        mockFirebaseAuth.downloadUserData.reset();

        // 模擬 localStorage
        originalLocalStorage = window.localStorage;
        Object.defineProperty(window, 'localStorage', {
            value: {
                _data: {},
                setItem: function(id, val) {
                    return this._data[id] = String(val);
                },
                getItem: function(id) {
                    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
                },
                removeItem: function(id) {
                    return delete this._data[id];
                },
                clear: function() {
                    return this._data = {};
                },
            },
            writable: true,
            configurable: true,
        });
        localStorage.clear();

        // 模擬 Vue 實例的相關屬性和方法
        vm = {
            user: { uid: 'test_uid' }, // 預設為已登入狀態
            isSyncing: false,
            reimbursable: JSON.parse(JSON.stringify(initialData.reimbursable)),
            our_own: JSON.parse(JSON.stringify(initialData.our_own)),
            savedEntries: [],
            enableAutoBackup: false,
            showTempMessage: QUnit.stub(),
            assignSavedData: QUnit.stub(),
            // 將模擬的 firebaseAuth 函數綁定到 vm 上，讓 firebaseHelpers 可以通過 this 訪問
            signOutUser: mockFirebaseAuth.signOutUser,
            uploadUserData: mockFirebaseAuth.uploadUserData,
            downloadUserData: mockFirebaseAuth.downloadUserData,
        };

        // 將 firebaseHelpers 的方法綁定到模擬的 vm 上
        for (const key in firebaseHelpers) {
            if (Object.hasOwnProperty.call(firebaseHelpers, key) && typeof firebaseHelpers[key] === 'function') {
                vm[key] = firebaseHelpers[key].bind(vm);
            }
        }
    });

    hooks.afterEach(() => {
        // 恢復原始的 localStorage
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            writable: true,
            configurable: true,
        });
    });

    QUnit.test('firebaseSignOut - 成功登出', async function(assert) {
        assert.expect(1); // 期望執行一次 assert
        const done = assert.async();

        mockFirebaseAuth.signOutUser.returns(Promise.resolve(true));

        await vm.firebaseSignOut();

        assert.true(mockFirebaseAuth.signOutUser.calledOnce, 'signOutUser 應被呼叫一次');
        done();
    });

    QUnit.test('firebaseSignOut - 登出失敗', async function(assert) {
        assert.expect(2); // 期望執行兩次 assert
        const done = assert.async();

        mockFirebaseAuth.signOutUser.returns(Promise.resolve(false));

        await vm.firebaseSignOut();

        assert.true(mockFirebaseAuth.signOutUser.calledOnce, 'signOutUser 應被呼叫一次');
        assert.true(vm.showTempMessage.calledWith('登出失敗，請重試！', 2000), '應顯示登出失敗訊息');
        done();
    });

    QUnit.test('backupToCloud - 已登入，備份成功 (非自動備份)', async function(assert) {
        assert.expect(3);
        const done = assert.async();

        mockFirebaseAuth.uploadUserData.returns(Promise.resolve(true));
        vm.user = { uid: 'test_uid' };
        vm.reimbursable.me.transport = 100;

        await vm.backupToCloud(false);

        assert.true(mockFirebaseAuth.uploadUserData.calledOnce, 'uploadUserData 應被呼叫一次');
        assert.true(vm.showTempMessage.calledWith('資料已成功備份至雲端！', 2000), '應顯示備份成功訊息');
        assert.false(vm.isSyncing, 'isSyncing 應為 false');
        done();
    });

    QUnit.test('backupToCloud - 已登入，備份成功 (自動備份)', async function(assert) {
        assert.expect(2);
        const done = assert.async();

        mockFirebaseAuth.uploadUserData.returns(Promise.resolve(true));
        vm.user = { uid: 'test_uid' };
        vm.reimbursable.me.transport = 100;

        await vm.backupToCloud(true);

        assert.true(mockFirebaseAuth.uploadUserData.calledOnce, 'uploadUserData 應被呼叫一次');
        assert.false(vm.showTempMessage.called, '自動備份時不應顯示臨時訊息');
        done();
    });

    QUnit.test('backupToCloud - 已登入，備份失敗', async function(assert) {
        assert.expect(3);
        const done = assert.async();

        mockFirebaseAuth.uploadUserData.returns(Promise.resolve(false));
        vm.user = { uid: 'test_uid' };

        await vm.backupToCloud();

        assert.true(mockFirebaseAuth.uploadUserData.calledOnce, 'uploadUserData 應被呼叫一次');
        assert.true(vm.showTempMessage.calledWith('資料備份至雲端失敗！', 2000), '應顯示備份失敗訊息');
        assert.false(vm.isSyncing, 'isSyncing 應為 false');
        done();
    });

    QUnit.test('backupToCloud - 未登入', async function(assert) {
        assert.expect(2);
        const done = assert.async();

        vm.user = null;

        await vm.backupToCloud();

        assert.false(mockFirebaseAuth.uploadUserData.called, 'uploadUserData 不應被呼叫');
        assert.true(vm.showTempMessage.calledWith('請先登入才能備份資料！', 2000), '應顯示未登入訊息');
        done();
    });

    QUnit.test('restoreFromCloud - 已登入，還原成功', async function(assert) {
        assert.expect(5);
        const done = assert.async();

        const cloudData = {
            reimbursable: { me: { meal: [{ amount: 100, note: 'cloud meal' }], transport: 50 } },
            our_own: { wife: { transport: 20 } },
            savedEntries: [{
                date: '2025-01-01',
                reimbursable: {},
                our_own: {}
            }]
        };
        mockFirebaseAuth.downloadUserData.returns(Promise.resolve(cloudData));
        vm.user = { uid: 'test_uid' };

        await vm.restoreFromCloud();

        assert.true(mockFirebaseAuth.downloadUserData.calledOnce, 'downloadUserData 應被呼叫一次');
        assert.true(vm.assignSavedData.calledWith(vm.reimbursable, cloudData.reimbursable), 'assignSavedData 應處理 reimbursable');
        assert.deepEqual(vm.savedEntries, cloudData.savedEntries, 'savedEntries 應從雲端還原');
        assert.true(vm.showTempMessage.calledWith('資料已成功從雲端還原！', 2000), '應顯示還原成功訊息');
        assert.equal(localStorage.getItem('familyCostCalculatorSavedEntries'), JSON.stringify(cloudData.savedEntries), 'localStorage 中的 savedEntries 應更新');
        done();
    });

    QUnit.test('restoreFromCloud - 已登入，還原失敗或雲端無資料', async function(assert) {
        assert.expect(2);
        const done = assert.async();

        mockFirebaseAuth.downloadUserData.returns(Promise.resolve(null)); // 模擬失敗或無資料
        vm.user = { uid: 'test_uid' };

        await vm.restoreFromCloud();

        assert.true(mockFirebaseAuth.downloadUserData.calledOnce, 'downloadUserData 應被呼叫一次');
        assert.true(vm.showTempMessage.calledWith('從雲端還原資料失敗或雲端無資料！', 2000), '應顯示還原失敗訊息');
        done();
    });

    QUnit.test('restoreFromCloud - 未登入', async function(assert) {
        assert.expect(2);
        const done = assert.async();

        vm.user = null;

        await vm.restoreFromCloud();

        assert.false(mockFirebaseAuth.downloadUserData.called, 'downloadUserData 不應被呼叫');
        assert.true(vm.showTempMessage.calledWith('請先登入才能還原資料！', 2000), '應顯示未登入訊息');
        done();
    });

    QUnit.test('toggleAutoBackup - 開啟自動備份', function(assert) {
        assert.expect(4);
        const done = assert.async(); // 需要處理 backupToCloud 的異步呼叫

        vm.enableAutoBackup = false;
        vm.user = { uid: 'test_uid' };
        mockFirebaseAuth.uploadUserData.returns(Promise.resolve(true)); // 模擬 backupToCloud 成功

        vm.toggleAutoBackup();

        assert.true(vm.enableAutoBackup, 'enableAutoBackup 應為 true');
        assert.equal(localStorage.getItem('autoBackupEnabled'), 'true', 'localStorage 中的 autoBackupEnabled 應為 true');
        assert.true(vm.showTempMessage.calledWith('自動備份已開啟！', 2000), '應顯示開啟訊息');
        // 檢查 backupToCloud 是否被呼叫
        // 這裡需要等待異步操作完成
        setTimeout(() => {
            assert.true(mockFirebaseAuth.uploadUserData.calledOnce, 'backupToCloud 應被觸發一次');
            done();
        }, 0); // 使用 setTimeout 來等待可能的微任務隊列，確保 backupToCloud 執行
    });

    QUnit.test('toggleAutoBackup - 關閉自動備份', function(assert) {
        assert.expect(3);

        vm.enableAutoBackup = true;
        vm.user = { uid: 'test_uid' };

        vm.toggleAutoBackup();

        assert.false(vm.enableAutoBackup, 'enableAutoBackup 應為 false');
        assert.equal(localStorage.getItem('autoBackupEnabled'), 'false', 'localStorage 中的 autoBackupEnabled 應為 false');
        assert.true(vm.showTempMessage.calledWith('自動備份已關閉！', 2000), '應顯示關閉訊息');
    });

    QUnit.test('toggleAutoBackup - 開啟自動備份但未登入', function(assert) {
        assert.expect(3);

        vm.enableAutoBackup = false;
        vm.user = null;

        vm.toggleAutoBackup();

        assert.true(vm.enableAutoBackup, 'enableAutoBackup 應為 true');
        assert.true(vm.showTempMessage.calledWith('自動備份已開啟！', 2000), '應顯示開啟訊息');
        assert.false(mockFirebaseAuth.uploadUserData.called, '未登入時不應觸發 backupToCloud');
    });
});
