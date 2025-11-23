import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import xgboost as xgb

class NBAPredictionEngine:
    def __init__(self, data_path=None):
        self.model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
        self.data = None
        # 如果你有上傳 CSV，可以在這裡讀取
        if data_path:
            self.data = pd.read_csv(data_path)

    def feature_engineering(self, df):
        """
        核心特徵工程：計算移動平均，絕對避免使用未來數據
        """
        df = df.sort_values(['team_id', 'date'])
        
        # 1. 建立 'Target' (目標)：下一場是否獲勝
        # 我們要把 'result' (勝負) 往上移一格，因為當天的數據是用來預測「結果」的
        # 但在訓練時，我們通常是用「今天的數據」預測「今天的結果」，
        # 關鍵在於 INPUT 特徵不能包含今天的「得分」等結果數據，只能包含「賽前」數據。
        # 為了簡化，這裡我們示範：用「過去 5 場平均」來預測「今日勝負」。
        
        # 計算每支球隊近 5 場的平均得分、平均失分
        # shift(1) 非常重要！代表「不包含這場比賽」，只看這場之前的
        df['rolling_pts'] = df.groupby('team_id')['pts'].transform(lambda x: x.shift(1).rolling(window=5).mean())
        df['rolling_opp_pts'] = df.groupby('team_id')['opp_pts'].transform(lambda x: x.shift(1).rolling(window=5).mean())
        
        # 加入勝率近況
        df['rolling_win_rate'] = df.groupby('team_id')['is_win'].transform(lambda x: x.shift(1).rolling(window=5).mean())

        # 移除因為 Rolling 產生的 NaN (前 5 場沒數據)
        df_clean = df.dropna()
        return df_clean

    def train_mock(self):
        """
        因為目前在 AI Studio 環境，我先生成假數據來演示邏輯給你看
        """
        # 模擬數據結構
        data = {
            'date': pd.date_range(start='2023-10-01', periods=100),
            'team_id': ['LAL'] * 50 + ['BOS'] * 50,
            'pts': np.random.randint(90, 120, 100),
            'opp_pts': np.random.randint(90, 120, 100),
            'is_win': np.random.randint(0, 2, 100)
        }
        df = pd.DataFrame(data)
        
        print("原始數據 (前 5 行):")
        print(df.head())

        # 執行特徵工程
        processed_df = self.feature_engineering(df)
        
        print("\n處理後數據 (包含近5場平均，前 5 行):")
        print(processed_df[['date', 'team_id', 'rolling_pts', 'is_win']].head())

        # 準備訓練特徵
        features = ['rolling_pts', 'rolling_opp_pts', 'rolling_win_rate']
        X = processed_df[features]
        y = processed_df['is_win']

        # 切分訓練集與測試集
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # 訓練模型
        self.model.fit(X_train, y_train)
        
        # 驗證
        preds = self.model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        print(f"\n模型訓練完成！測試集準確度: {acc:.2f}")
        return self.model

# 在 AI Studio 中直接執行這段
if __name__ == "__main__":
    engine = NBAPredictionEngine()
    engine.train_mock()
