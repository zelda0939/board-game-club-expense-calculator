import { signOutUser, uploadUserData, downloadUserData, createUser, signInWithEmail, setFirebaseMocks } from '../firebaseAuth.js';

QUnit.module('firebaseAuth', hooks => {
    const mockAuth = {};
    const mockFirestore = {
        doc: sinon.stub().returns({ /* mock doc ref */ }),
        setDoc: sinon.stub().returns(Promise.resolve()),
        getDoc: sinon.stub(),
    };

    const mockFirebaseFunctions = {
        signOut: sinon.stub().returns(Promise.resolve()),
        createUserWithEmailAndPassword: sinon.stub(),
        signInWithEmailAndPassword: sinon.stub(),
        getAuth: sinon.stub().returns(mockAuth),
        getFirestore: sinon.stub().returns(mockFirestore),
        // onAuthStateChanged 需要特殊處理，它會立即觸發一次，並在登入/登出時再次觸發
        onAuthStateChanged: sinon.stub().callsFake((auth, callback) => {
            // 模擬立即觸發一次，通常是 null (未登入)
            callback(null); 
            // 返回一個取消監聽的函數
            return () => {};
        }),
        doc: mockFirestore.doc,
        setDoc: mockFirestore.setDoc,
        getDoc: mockFirestore.getDoc,
    };

    hooks.beforeEach(() => {
        // 重置所有 stub
        for (const key in mockFirebaseFunctions) {
            if (QUnit.is('function', mockFirebaseFunctions[key]) && mockFirebaseFunctions[key].reset) {
                mockFirebaseFunctions[key].reset();
            }
        }
        mockFirestore.doc.reset();
        mockFirestore.setDoc.reset();
        mockFirestore.getDoc.reset();

        // 注入模擬函數
        setFirebaseMocks(mockFirebaseFunctions);
    });

    QUnit.test('signOutUser - 成功登出', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        mockFirebaseFunctions.signOut.returns(Promise.resolve());

        const result = await signOutUser();

        assert.true(result, '登出應成功返回 true');
        done();
    });

    QUnit.test('signOutUser - 登出失敗', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        mockFirebaseFunctions.signOut.returns(Promise.reject(new Error('Sign out error')));

        const result = await signOutUser();

        assert.false(result, '登出失敗應返回 false');
        done();
    });

    QUnit.test('uploadUserData - 成功上傳數據', async function(assert) {
        assert.expect(2);
        const done = assert.async();

        const userId = 'testUser';
        const data = { key: 'value' };

        mockFirestore.doc.returns({ /* mock doc ref */ });
        mockFirestore.setDoc.returns(Promise.resolve());

        const result = await uploadUserData(userId, data);

        assert.true(result, '上傳應成功返回 true');
        assert.true(mockFirestore.setDoc.calledOnce, 'setDoc 應被呼叫一次');
        done();
    });

    QUnit.test('uploadUserData - 上傳數據失敗', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        const userId = 'testUser';
        const data = { key: 'value' };

        mockFirestore.doc.returns({ /* mock doc ref */ });
        mockFirestore.setDoc.returns(Promise.reject(new Error('Upload error')));

        const result = await uploadUserData(userId, data);

        assert.false(result, '上傳失敗應返回 false');
        done();
    });

    QUnit.test('downloadUserData - 成功下載數據', async function(assert) {
        assert.expect(2);
        const done = assert.async();

        const userId = 'testUser';
        const mockData = { some: 'data' };
        mockFirestore.getDoc.returns(Promise.resolve({
            exists: () => true,
            data: () => ({ data: mockData })
        }));

        const result = await downloadUserData(userId);

        assert.deepEqual(result, mockData, '應返回正確的數據');
        assert.true(mockFirestore.getDoc.calledOnce, 'getDoc 應被呼叫一次');
        done();
    });

    QUnit.test('downloadUserData - 雲端無此使用者資料', async function(assert) {
        assert.expect(2);
        const done = assert.async();

        const userId = 'testUser';
        mockFirestore.getDoc.returns(Promise.resolve({
            exists: () => false,
            data: () => undefined
        }));

        const result = await downloadUserData(userId);

        assert.equal(result, null, '無資料時應返回 null');
        assert.true(mockFirestore.getDoc.calledOnce, 'getDoc 應被呼叫一次');
        done();
    });

    QUnit.test('downloadUserData - 下載數據失敗', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        const userId = 'testUser';
        mockFirestore.getDoc.returns(Promise.reject(new Error('Download error')));

        const result = await downloadUserData(userId);

        assert.equal(result, null, '下載失敗應返回 null');
        done();
    });

    QUnit.test('createUser - 成功創建用戶', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        const email = 'test@example.com';
        const password = 'password123';
        const mockUser = { uid: 'new_user_id' };
        mockFirebaseFunctions.createUserWithEmailAndPassword.returns(Promise.resolve({
            user: mockUser
        }));

        const result = await createUser(email, password);

        assert.deepEqual(result, mockUser, '應返回新創建的用戶對象');
        done();
    });

    QUnit.test('createUser - 創建用戶失敗', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        const email = 'test@example.com';
        const password = 'password123';
        const errorMessage = 'Weak password';
        mockFirebaseFunctions.createUserWithEmailAndPassword.returns(Promise.reject(new Error(errorMessage)));

        try {
            await createUser(email, password);
            assert.notOk('應該拋出錯誤', '此處不應執行');
        } catch (error) {
            assert.equal(error.message, errorMessage, '應拋出正確的錯誤訊息');
        }
        done();
    });

    QUnit.test('signInWithEmail - 成功登入', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        const email = 'test@example.com';
        const password = 'password123';
        const mockUser = { uid: 'existing_user_id' };
        mockFirebaseFunctions.signInWithEmailAndPassword.returns(Promise.resolve({
            user: mockUser
        }));

        const result = await signInWithEmail(email, password);

        assert.deepEqual(result, mockUser, '應返回登入的用戶對象');
        done();
    });

    QUnit.test('signInWithEmail - 登入失敗', async function(assert) {
        assert.expect(1);
        const done = assert.async();

        const email = 'test@example.com';
        const password = 'wrong_password';
        mockFirebaseFunctions.signInWithEmailAndPassword.returns(Promise.reject(new Error('Wrong password')));

        const result = await signInWithEmail(email, password);

        assert.equal(result, null, '登入失敗應返回 null');
        done();
    });
});
