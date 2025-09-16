import { signInWithGoogle, signOutUser, uploadUserData, downloadUserData } from './firebaseAuth.js';

export default {
    async firebaseSignIn() {
        const user = await signInWithGoogle();
        if (!user){
            this.showTempMessage("登入失敗，請重試！", 2000);
        }
    },
    async firebaseSignOut() {
        const success = await signOutUser();
        if (!success) {
            this.showTempMessage("登出失敗，請重試！", 2000);
        }
    },
    async backupToCloud(isAutoBackup = false) {
        if (this.user) {
            this.isSyncing = true;
            const currentData = {
                reimbursable: this.reimbursable,
                our_own: this.our_own,
                savedEntries: this.savedEntries // 也備份 savedEntries
            };
            const success = await uploadUserData(this.user.uid, currentData);
            if (success) {
                if (!isAutoBackup) {
                    this.showTempMessage("資料已成功備份至雲端！", 2000);
                }
            } else {
                this.showTempMessage("資料備份至雲端失敗！", 2000);
            }
            this.isSyncing = false;
        } else {
            this.showTempMessage("請先登入才能備份資料！", 2000);
        }
    },
    async restoreFromCloud() {
        if (this.user) {
            this.showTempMessage("正在從雲端下載資料...", 1000);
            const cloudData = await downloadUserData(this.user.uid);
            if (cloudData) {
                // 將下載的數據應用到本地狀態
                this.assignSavedData(this.reimbursable, cloudData.reimbursable);
                this.assignSavedData(this.our_own, cloudData.our_own);
                this.savedEntries = cloudData.savedEntries || []; // 還原 savedEntries
                localStorage.setItem('familyCostCalculator', JSON.stringify({
                    reimbursable: this.reimbursable,
                    our_own: this.our_own,
                }));
                localStorage.setItem('familyCostCalculatorSavedEntries', JSON.stringify(this.savedEntries)); // 更新 savedEntries 到 localStorage
                this.showTempMessage("資料已成功從雲端還原！", 2000);
            } else {
                this.showTempMessage("從雲端還原資料失敗或雲端無資料！", 2000);
            }
        } else {
            this.showTempMessage("請先登入才能還原資料！", 2000);
        }
    },
    toggleAutoBackup() {
        this.enableAutoBackup = !this.enableAutoBackup;
        localStorage.setItem('autoBackupEnabled', this.enableAutoBackup);
        this.showTempMessage(`自動備份已${this.enableAutoBackup ? '開啟' : '關閉'}！`, 2000);
        // 可以選擇在此處觸發一次備份，如果開啟了自動備份
        if (this.enableAutoBackup && this.user) {
            this.backupToCloud(true);
        }
    },
}