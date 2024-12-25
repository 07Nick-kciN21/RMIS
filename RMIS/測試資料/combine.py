import pandas as pd
import json

def merge_and_transform_csv(road_csv_path, pile_csv_path, output_csv_path):
    # 讀取兩個 CSV 文件
    road_df = pd.read_csv(road_csv_path)
    pile_df = pd.read_csv(pile_csv_path)

    # 合併兩個 DataFrame，根據 'road_id' 欄位保留所有
    merged_df = pd.merge(road_df, pile_df, on='road_id', how='left')

    merged_df.to_csv(output_csv_path, index=False)
    print(f"Process completed. Output saved to {output_csv_path}")

# Example usage:
road_csv_path = 'road.csv'  # Replace with the correct path to your road.csv
pile_csv_path = 'pile_with_prop_臨時道路.csv'  # Replace with the correct path to your pile_with_prop_人手孔.csv
output_csv_path = '測試資料_臨時道路.csv'  # Replace with the desired output path

merge_and_transform_csv(road_csv_path, pile_csv_path, output_csv_path)
