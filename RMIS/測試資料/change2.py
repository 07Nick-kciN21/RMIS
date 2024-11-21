import pandas as pd
import json


import pandas as pd
import json

# 讀取兩個 CSV 文件
csv1 = pd.read_csv('pile.csv')
csv2 = pd.read_csv('prop2.csv')

# 假設 csv2 的所有列需要被放入 csv1 的 pile_prop 中，並且 csv1 和 csv2 的行數相同
csv1['pile_prop'] = csv2.apply(lambda row: json.dumps(row.to_dict()), axis=1)

# 將結果儲存到新的 CSV 文件中
csv1.to_csv('csv1_with_pile_prop.csv', index=False)
