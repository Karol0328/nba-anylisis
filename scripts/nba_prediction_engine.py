import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import xgboost as xgb

class NBAPredictionEngine:
    def __init__(self, data_path=None):
        # 初始化 XGBoost 模型
        # use_label_encoder=False 避免警告，eval_metric='logloss' 適用於二元分類
        self.model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
        self.data = None
        
        if data_path:
            # 如果有提供 CSV 路徑，則讀取
            self.data = pd.read_csv(data_path)

    def feature_engineering(self, df):
        """
        核心特徵工程：計算移動平均，絕對避免使用未來數據 (Data Leakage)
        """
        # 確保按球隊和日期排序，這樣 shift 才有意義
        df = df.sort_values(['team_id', 'date'])
        
        # --- 關鍵步驟：防止未來數據洩露 ---
        # 我們要預測的是「這場比賽的結果」，所以 Input 只能是「這場比賽之前」的數據。
        # 使用 shift(1) 將數據往下移一格，代表「昨天的數據」。
        
        # 計算每支球隊近 5 場的平均得分 (Rolling Mean)
        df['rolling_pts'] = df.groupby('team_id')['pts'].transform(lambda x: x.shift(1).rolling(window=5).mean())
        
        # 計算每支球隊近 5 場的平均失分
        df['rolling_opp_pts'] = df.groupby('team_id')['opp_pts'].transform(lambda x: x.shift(1).rolling(window=5).mean())
        
        # 計算每支球隊近 5 場的勝率
        # 假設 is_win 是 0 或 1
        df['rolling_win_rate'] = df.groupby('team_id')['is_win'].transform(lambda x: x.shift(1).rolling(window=5).mean())

        # 移除因為 Rolling 產生的 NaN (前 5 場沒數據的列)
        df_clean = df.dropna().copy()
        return df_clean

    def train_mock(self):
        """
        模擬訓練流程 (用於測試邏輯)
        """
        print("--- 開始模擬訓練流程 ---")
        
        # 1. 生成假數據
        data = {
            'date': pd.date_range(start='2023-10-01', periods=100),
            'team_id': ['LAL'] * 50 + ['BOS'] * 50,
            'pts': np.random.randint(90, 130, 100),
            'opp_pts': np.random.randint(90, 130, 100),
            'is_win': np.random.randint(0, 2, 100)
        }
        df = pd.DataFrame(data)
        
        # 2. 執行特徵工程
        processed_df = self.feature_engineering(df)
        
        print(f"原始數據筆數: {len(df)}")
        print(f"處理後數據筆數 (移除 NaN 後): {len(processed_df)}")
        print("\n處理後的前 5 筆數據 (檢查 rolling_pts 是否合理):")
        print(processed_df[['date', 'team_id', 'rolling_pts', 'is_win']].head())

        # 3. 準備訓練特徵 (X) 和 目標 (y)
        features = ['rolling_pts', 'rolling_opp_pts', 'rolling_win_rate']
        X = processed_df[features]
        y = processed_df['is_win']

        # 4. 切分訓練集與測試集 (80% 訓練, 20% 測試)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # 5. 訓練模型
        self.model.fit(X_train, y_train)
        
        # 6. 驗證準確度
        preds = self.model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        print(f"\n模型訓練完成！測試集準確度: {acc:.2f}")
        
        return self.model

# 這段是用來讓你可以直接執行這個檔案測試用的
if __name__ == "__main__":
    engine = NBAPredictionEngine()
    engine.train_mock()
