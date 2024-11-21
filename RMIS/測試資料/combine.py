import pandas as pd
import json

def merge_and_transform_csv(road_csv_path, pile_csv_path, output_csv_path):
    # 讀取兩個 CSV 文件
    road_df = pd.read_csv(road_csv_path)
    pile_df = pd.read_csv(pile_csv_path)

    # 合併兩個 DataFrame，根據 'road_id' 欄位保留所有
    merged_df = pd.merge(road_df, pile_df, on='road_id', how='left')

    # Create 'pile_data' column as a JSON object containing all relevant fields from pile_df
    # merged_df['pile_data'] = merged_df.apply(lambda row: json.dumps({
    #     col: row[col] for col in pile_df.columns  # Dynamically include all columns from pile_df
    # }), axis=1)

    # Group by 'road_id' and aggregate 'pile_data' into a list for each road_id
    # grouped_df = merged_df.groupby('road_id').agg({
    #     'city_id': 'first',
    #     'dist_id': 'first',
    #     'road_city': 'first',
    #     'road_dist': 'first',
    #     'road_num': 'first',
    #     'road_name': 'first',
    #     'road_alias': 'first',
    #     'road_section': 'first',
    #     'road_lane': 'first',
    #     'road_alley': 'first',
    #     'road_level': 'first',
    #     'pile_data': lambda x: json.dumps([json.loads(item) for item in x])  # Combine into one JSON array
    # }).reset_index()

    # Save the result to a CSV file
    # grouped_df.to_csv(output_csv_path, index=False)
    merged_df.to_csv(output_csv_path, index=False)
    print(f"Process completed. Output saved to {output_csv_path}")

# Example usage:
road_csv_path = 'road.csv'  # Replace with the correct path to your road.csv
pile_csv_path = 'pile_with_prop_人手孔.csv'  # Replace with the correct path to your pile_with_prop_人手孔.csv
output_csv_path = '測試資料2.csv'  # Replace with the desired output path

merge_and_transform_csv(road_csv_path, pile_csv_path, output_csv_path)
