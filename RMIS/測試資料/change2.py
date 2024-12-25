import pandas as pd
import json


# 讀取兩個 CSV 文件
csv1 = pd.read_csv('pile_with_prop_.csv')
csv2 = pd.read_csv('臨時道路(借用路線).csv')

# 將 csv2 的每一行轉換為 JSON 字串，並存儲到csv1中'pile_distance'欄位 = 0 的 'pile_prop' 欄位中，要以utf-8 BOM編碼儲存
csv1['pile_prop'] = csv2.apply(lambda row: json.dumps(row.to_dict()), axis=1)

# 將結果儲存到新的 CSV 文件中
csv1.to_csv('pile_with_prop_臨時道路.csv', index=False)
