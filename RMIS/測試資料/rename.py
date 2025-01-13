import os
import shutil
# 生成上述代號_01.png

# 讀取_01.png
input_filename = "_01.png"

# 代號列表
codes = [
    "0zbsag", "lbrbfd", "e6spn3", "dvv2vk", "bdp5a4", "y5ryck", "w54ljl",
    "zjjq25", "r4jbun", "esgr5e", "yetyj6", "ynfky8", "790e9s", "jtxgns", "ugyw4v"
]

# 生成上述代號_01.png
for code in codes:
    new_filename = f"{code}_01.png"
    # 生成新的圖片
    shutil.copyfile(input_filename, new_filename)
    print(f"生成 {new_filename}")