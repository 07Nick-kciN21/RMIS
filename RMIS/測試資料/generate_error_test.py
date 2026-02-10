"""
生成「道路專案匯入 - 照片驗證錯誤」測試資料
- 道路專案_錯誤測試.xlsx: 包含 3 筆專案，每筆都引用了照片
- 道路專案_錯誤測試照片.zip: 故意缺少部分目錄和照片，用於測試驗證邏輯
  - ERR_TEST_01: 目錄存在，但缺少 02.png (只有 01.png)
  - ERR_TEST_02: 整個目錄不存在
  - ERR_TEST_03: 目錄存在，但缺少 01.png 和 03.png (只有 02.png)
"""

import json
import os
import zipfile
from io import BytesIO

# pip install openpyxl
from openpyxl import Workbook


def create_excel():
    wb = Workbook()
    ws = wb.active
    ws.title = "道路專案"

    # 標題列 (26 欄)
    headers = [
        "專案代號", "提案人", "行政區", "階段",
        "起點", "終點", "起訖位置", "道路長度",
        "現況路寬", "計畫路寬", "公有土地", "私有土地",
        "公私土地", "工程經費", "用地經費", "補償經費",
        "合計經費", "備註", "審議年度", "案件類型",
        "工程名稱", "RC數量", "鐵皮屋數量", "審議結果",
        "拓寬範圍JSON", "街景照片JSON"
    ]
    ws.append(headers)

    # 專案 1: ZIP 中有目錄但缺少 02.png
    photos_1 = json.dumps([
        {"lat": 24.950000, "lng": 121.225928, "photoName": "01.png"},
        {"lat": 24.950170, "lng": 121.226626, "photoName": "02.png"},
    ], ensure_ascii=False)

    # 專案 2: ZIP 中完全沒有此目錄
    photos_2 = json.dumps([
        {"lat": 24.960000, "lng": 121.235000, "photoName": "01.png"},
    ], ensure_ascii=False)

    # 專案 3: ZIP 中有目錄但缺少 01.png 和 03.png
    photos_3 = json.dumps([
        {"lat": 24.970000, "lng": 121.245000, "photoName": "01.png"},
        {"lat": 24.970100, "lng": 121.245100, "photoName": "02.png"},
        {"lat": 24.970200, "lng": 121.245200, "photoName": "03.png"},
    ], ensure_ascii=False)

    expansion_json = json.dumps([
        {"lat": 24.950000, "lng": 121.225000},
        {"lat": 24.951000, "lng": 121.226000},
    ], ensure_ascii=False)

    rows = [
        # ProjectId, Proposer, District, Step, Start, End, StartEnd, Length,
        # CurWidth, PlanWidth, PubLand, PriLand, PubPriLand, ConBudget, LandBudget, CompBudget,
        # TotalBudget, Remarks, ReviewYear, CaseType, ProjectName, RC, Tin, ReviewResult,
        # ExpansionJSON, PhotoJSON
        [
            "ERR_TEST_01", "測試提案人A", "竹北市", "1",
            "測試路起點A", "測試路終點A", "測試路起點A至測試路終點A", "500",
            "8", "12", "100", "50",
            "150", 1000, 500, 200,
            1700, "錯誤測試-缺少部分照片", "114", "新闢",
            "測試工程A", "0", "0", "通過",
            expansion_json, photos_1
        ],
        [
            "ERR_TEST_02", "測試提案人B", "竹東鎮", "1",
            "測試路起點B", "測試路終點B", "測試路起點B至測試路終點B", "300",
            "6", "10", "80", "40",
            "120", 800, 400, 100,
            1300, "錯誤測試-缺少整個目錄", "114", "拓寬",
            "測試工程B", "1", "0", "通過",
            expansion_json, photos_2
        ],
        [
            "ERR_TEST_03", "測試提案人C", "新豐鄉", "1",
            "測試路起點C", "測試路終點C", "測試路起點C至測試路終點C", "700",
            "10", "15", "120", "60",
            "180", 1500, 700, 300,
            2500, "錯誤測試-缺少多張照片", "114", "新闢",
            "測試工程C", "0", "2", "通過",
            expansion_json, photos_3
        ],
    ]

    for row in rows:
        ws.append(row)

    return wb


def create_zip():
    """
    建立一個故意不齊全的 ZIP:
    - ERR_TEST_01/01.png  (有, 但缺 02.png)
    - ERR_TEST_02 目錄完全不存在
    - ERR_TEST_03/02.png  (有, 但缺 01.png 和 03.png)
    """
    # 建立一個 1x1 像素的假 PNG 作為佔位
    # PNG 最小有效檔案
    fake_png = (
        b'\x89PNG\r\n\x1a\n'  # PNG signature
        b'\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
        b'\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N'
        b'\x00\x00\x00\x00IEND\xaeB`\x82'
    )

    buf = BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        # ERR_TEST_01: 只放 01.png，不放 02.png
        zf.writestr("ERR_TEST_01/01.png", fake_png)

        # ERR_TEST_02: 完全不建立目錄

        # ERR_TEST_03: 只放 02.png，不放 01.png 和 03.png
        zf.writestr("ERR_TEST_03/02.png", fake_png)

    return buf.getvalue()


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # 生成 Excel
    wb = create_excel()
    excel_path = os.path.join(script_dir, "道路專案_錯誤測試.xlsx")
    wb.save(excel_path)
    print(f"已生成: {excel_path}")

    # 生成 ZIP
    zip_data = create_zip()
    zip_path = os.path.join(script_dir, "道路專案_錯誤測試照片.zip")
    with open(zip_path, "wb") as f:
        f.write(zip_data)
    print(f"已生成: {zip_path}")

    print()
    print("預期錯誤訊息:")
    print("  - 專案 ERR_TEST_01: 壓縮檔中找不到照片「02.png」")
    print("  - 專案 ERR_TEST_02: 壓縮檔中找不到對應的照片目錄「ERR_TEST_02」")
    print("  - 專案 ERR_TEST_03: 壓縮檔中找不到照片「01.png」")
    print("  - 專案 ERR_TEST_03: 壓縮檔中找不到照片「03.png」")
