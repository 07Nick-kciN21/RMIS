using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Account.Users;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using RMIS.Repositories;
using System;
using System.Text.Json;

namespace RMIS.Controllers
{
    
    [Route("api/[controller]")]
    [ApiController]
    public class TestController : ControllerBase
    {
        private readonly MapDBContext _mapDBContext;

        public TestController(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        [HttpGet("get/Pipeline/DepartmentIds")]
        public async Task<IActionResult> GetDepartmentId(Guid PipelineId)
        {
            try
            {
                var Ids = await _mapDBContext.Pipelines.Where(p => p.Id == PipelineId).Select(p => p.DepartmentIds).ToListAsync();
                var ids = Ids.First();
                if (Ids != null)
                {
                    return Ok(new { success = true, message = ids });
                }
                else
                {
                    return BadRequest(new { success = false, message = "取得失敗" });
                }
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "取得失敗" });
            }
        }

        public class CategoryList
        {
            public Guid Id { get; set; } // 唯一識別碼
            public string Name { get; set; } // 分類名稱
            public int OrderId { get; set; }
            public Guid? ParentId { get; set; }
            // 允許存取的部門 (可多個)
            public List<int> DepartmentIds { get; set; } = new();
        }

        [HttpGet("update/Category/DepartmentIds")]
        public IActionResult UpdateDepartmentId(Guid id, int deptId)
        {
            try
            {
                var rootCategory = _mapDBContext.Categories
                    .Where(c => c.Id == id)
                    .First();
                
                if (rootCategory == null)
                {
                    return BadRequest(new { success = false, message = "找不到分類" });
                }
                rootCategory.DepartmentIds.Add(deptId);
                _mapDBContext.SaveChanges();
                searchCategories(rootCategory.Id, deptId);

                return Ok(new { success = true, message = "更新成功" });
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "更新失敗" });
            }
        }

        private bool searchCategories(Guid? parentId, int deptIds)
        {
            var Pipelines = _mapDBContext.Pipelines.Where(p => p.CategoryId == parentId).ToList();
            foreach(var pipeline in Pipelines)
            {
                pipeline.DepartmentIds.Add(deptIds);
            }
            var Categories = _mapDBContext.Categories
                .Where(c => c.ParentId == parentId)
                .OrderBy(c => c.OrderId)
                .ToList();
            foreach(var Category in Categories)
            {
                Category.DepartmentIds.Add(deptIds);
                searchCategories(Category.Id, deptIds);
            }
            _mapDBContext.SaveChanges();
            return true;
        }
        [HttpGet("Get/TreeData")]
        public async Task<IActionResult> BuildTreeData(int departmentId)
        {
            // 取得所有具有部門代號的根Categories
            var allCategories = await _mapDBContext.Categories.ToListAsync();
            var jsTreeData = BuildJsTreeData(allCategories, null, departmentId);
            return Ok(new { menuData = jsTreeData });
        }
        private List<object> BuildJsTreeData(List<Category> allCategories, Guid? parentId, int deptId)
        {
            var result = new List<object>();
            // 選擇當前層級的分類
            var currentCategories = allCategories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId).ToList();
            foreach (var category in currentCategories)
            {
                // 創建分類節點
                var categoryNode = new
                {
                    id = category.Id.ToString(),
                    text = category.Name,
                    parent = parentId.HasValue ? parentId.Value.ToString() : "#",
                    children = new List<object>(),
                    tag = "node"
                };

                // 獲取該分類下的所有管道
                var currentPipelines = _mapDBContext.Pipelines.Where(p => p.CategoryId == category.Id).ToList();
                foreach (var pipeline in currentPipelines)
                {
                    // 為每個管道創建節點
                    var pipelineNode = new
                    {
                        id = pipeline.Id.ToString(),
                        text = pipeline.Name,
                        parent = category.Id.ToString(),
                        children = false, // 管道不再有子節點，設定 children 為 false
                        tag = "pipeline"
                    };

                    // 將管道節點添加到分類的 children 中
                    ((List<object>)categoryNode.children).Add(pipelineNode);
                }

                // 處理該分類的子分類
                var childCategories = BuildJsTreeData(allCategories, category.Id, deptId);
                if (childCategories.Any())
                {
                    ((List<object>)categoryNode.children).AddRange(childCategories);
                }
                result.Add(categoryNode);
            }
            return result;
        }

        [HttpGet("Get/CatData")]
        public async Task<IActionResult> searchTree(Guid id)
        {
            var Categories = await _mapDBContext.Categories.ToListAsync();
            var result = BuildJsTreeData(Categories, id, 0);
            return Ok(result);
        }

        [HttpPost("Update/Pipeline/DepartmentId")]
        public async Task<IActionResult> searchTree(Guid pipeId, int deptId)
        {
            var pipeline = _mapDBContext.Pipelines.Find(pipeId);
            pipeline.DepartmentIds.Add(deptId);
            searchParentCategory(pipeline.CategoryId, deptId);
            _mapDBContext.SaveChanges();
            return Ok("更新完成");
        }
        private void searchParentCategory(Guid? id, int deptId)
        {
            var parentCat = _mapDBContext.Categories.First(c => c.Id == id);
            if (!parentCat.DepartmentIds.Contains(deptId))
            {
                parentCat.DepartmentIds.Add(deptId);
                _mapDBContext.SaveChanges();
            }
            if(parentCat.ParentId != null)
            {
                searchParentCategory(parentCat.ParentId, deptId);
            }
        }
        [HttpPost("Get/getRoadByCSV")]
        public async Task<IActionResult> getRoadByCSVInput(int departmentId)
        {
            // 找到所有符合的pipeline
            var allPipelines = await _mapDBContext.Pipelines
                .Where(c => c.DepartmentIds
                    .Contains(departmentId))
                .ToListAsync();
            var allCategory = await _mapDBContext.Categories
                .Where(c => c.DepartmentIds
                    .Contains(departmentId))
                .ToListAsync();

            if (allPipelines == null)
            {
                return null;
            }
            var pipelineSelectList = new List<SelectListItem>();
            buildPipelinePath(pipelineSelectList, allCategory, allPipelines, null, "");
            // 建立 SelectListItem
            var model = new AddRoadByCSVInput
            {
                Pipelines = pipelineSelectList
            };

            return Ok(new{ model});
        }

        private string buildCategoryPath(List<Category> allCategory, Guid? parentId)
        {
            var category = allCategory.FirstOrDefault(ac => ac.Id == parentId);
            if (category == null) return string.Empty;

            if (category.ParentId == null)
            {
                return category.Name;
            }
            return buildCategoryPath(allCategory, category.ParentId) + "/" + category.Name;
        }

        private void buildPipelinePath(List<SelectListItem> pipelineSelectList, List<Category> allCategory, List<Pipeline> allPipeline, Guid? parentId, string pathName)
        {
            var currentCategories = allCategory.Where(ac => ac.ParentId == parentId).OrderBy(ac => ac.OrderId).ToList();
            foreach(var category in currentCategories)
            {
                var pipelines = allPipeline.Where(ap => ap.CategoryId == category.Id).ToList();
                var next_path = pathName + "/" + category.Name;
                foreach (var pipeline in allPipeline)
                {
                    pipelineSelectList.Add(new SelectListItem
                    {
                        Text = next_path + "/" + pipeline.Name,
                        Value = pipeline.Id.ToString()
                    });
                }
                buildPipelinePath(pipelineSelectList, allCategory, allPipeline, category.Id, next_path);
            }
        }

        /// <summary>
        /// 批次匯入所有管線 GeoJSON（依檔名自動對應 Category/Pipeline）
        /// </summary>
        [HttpPost("BatchImportPipelineGeoJson")]
        public async Task<IActionResult> BatchImportPipelineGeoJson()
        {
            // 檔名 → (categoryName, pipelineName)
            var mapping = new Dictionary<string, (string cat, string pipe)>
            {
                ["污水系統人手孔.json"]    = ("污水系統",   "人手孔"),
                ["污水系統管線.json"]      = ("污水系統",   "管線"),
                ["雨水系統人手統.json"]    = ("雨水系統",   "人手孔"),
                ["雨水系統管線.json"]      = ("雨水系統",   "管線"),
                ["一般電信系統人手孔.json"] = ("一般電信系統","人手孔"),
                ["有線電視系統人手孔.json"] = ("有線電視系統","人手孔"),
                ["配電系統人手孔.json"]    = ("配電系統",   "人手孔"),
                ["配電設備.json"]          = ("配電系統",   "配電設備"),
                ["寬頻管道人手孔.json"]    = ("寬頻管道",   "人手孔"),
                ["消防栓.json"]            = ("消防",       "消防栓"),
            };

            var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "測試資料", "管線資料");
            var results = new List<object>();

            foreach (var (fileName, (cat, pipe)) in mapping)
            {
                var filePath = Path.Combine(baseDir, fileName);
                var (success, message, areaCount, pointCount) = await ImportSingleGeoJson(cat, pipe, filePath);
                results.Add(new { file = fileName, success, message, areaCount, pointCount });
            }

            return Ok(results);
        }

        /// <summary>
        /// 從 GeoJSON 檔案匯入 Pipeline / Layer / Area / Point（TWD97 TM2 → WGS84）
        /// </summary>
        [HttpPost("ImportPipelineGeoJson")]
        public async Task<IActionResult> ImportPipelineGeoJson(
            string categoryName, string pipelineName, string fileName)
        {
            var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "測試資料", "管線資料");
            var filePath = Path.Combine(baseDir, fileName);
            var (success, message, areaCount, pointCount) = await ImportSingleGeoJson(categoryName, pipelineName, filePath);
            var body = new { success, message, areaCount, pointCount };
            return success ? Ok(body) : StatusCode(500, body);
        }

        private async Task<(bool success, string message, int areaCount, int pointCount)> ImportSingleGeoJson(
            string categoryName, string pipelineName, string filePath)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var adminDistId = Guid.Parse("B0D453B9-CDE8-4733-A305-02E24EC9A52E");

                // 1. 讀取 GeoJSON
                var jsonContent = await System.IO.File.ReadAllTextAsync(filePath);
                var features = JsonSerializer.Deserialize<List<JsonElement>>(jsonContent);
                if (features == null || features.Count == 0)
                    return (false, "GeoJSON 無資料", 0, 0);

                // 2. 自動偵測幾何類型
                var geomType = features[0].GetProperty("geometry").GetProperty("type").GetString();
                var geometryKind = geomType == "Point" ? "point" : "line";

                // 3. 找 Category
                var category = await _mapDBContext.Categories
                    .FirstOrDefaultAsync(c => c.Name == categoryName);
                if (category == null)
                    return (false, $"Category '{categoryName}' 不存在", 0, 0);

                // 4. 找或建 GeometryType
                var geometryType = await _mapDBContext.GeometryTypes
                    .FirstOrDefaultAsync(gt => gt.Kind == geometryKind);
                Guid geometryTypeId;
                if (geometryType == null)
                {
                    geometryTypeId = Guid.NewGuid();
                    await _mapDBContext.GeometryTypes.AddAsync(new GeometryType
                    {
                        Id = geometryTypeId,
                        Name = pipelineName,
                        Kind = geometryKind,
                        Svg = "",
                        Color = "#3388ff",
                        OrderId = 99
                    });
                }
                else
                {
                    geometryTypeId = geometryType.Id;
                }

                // 5. 找或建 Pipeline + Layer
                var pipeline = await _mapDBContext.Pipelines
                    .FirstOrDefaultAsync(p => p.CategoryId == category.Id && p.Name == pipelineName);
                Guid layerId;

                if (pipeline == null)
                {
                    var pipelineId = Guid.NewGuid();
                    layerId = Guid.NewGuid();
                    await _mapDBContext.Pipelines.AddAsync(new Pipeline
                    {
                        Id = pipelineId,
                        Name = pipelineName,
                        CategoryId = category.Id,
                        ManagementUnit = categoryName,
                        IsGeneralPipeline = true,
                        DepartmentIds = new List<int>()
                    });
                    await _mapDBContext.Layers.AddAsync(new Layer
                    {
                        Id = layerId,
                        Name = pipelineName,
                        GeometryTypeId = geometryTypeId,
                        PipelineId = pipelineId,
                        ImportEnabled = false
                    });
                }
                else
                {
                    var existingLayer = await _mapDBContext.Layers
                        .FirstOrDefaultAsync(l => l.PipelineId == pipeline.Id);
                    if (existingLayer == null)
                        return (false, "Pipeline 無對應 Layer", 0, 0);
                    layerId = existingLayer.Id;
                }

                // 6. 匯入 Area / Point
                int areaCount = 0, pointCount = 0;

                if (geometryKind == "point")
                {
                    var areaId = Guid.NewGuid();
                    await _mapDBContext.Areas.AddAsync(new Area
                    {
                        Id = areaId,
                        Name = pipelineName,
                        LayerId = layerId,
                        ConstructionUnit = "未填寫",
                        AdminDistId = adminDistId
                    });
                    areaCount++;

                    for (int i = 0; i < features.Count; i++)
                    {
                        var coords = features[i].GetProperty("geometry").GetProperty("coordinates");
                        var (lat, lon) = Twd97ToWgs84(coords[0].GetDouble(), coords[1].GetDouble());
                        var props = features[i].GetProperty("properties");
                        await _mapDBContext.Points.AddAsync(new Point
                        {
                            Id = Guid.NewGuid(),
                            AreaId = areaId,
                            Index = i,
                            Latitude = lat,
                            Longitude = lon,
                            Property = props.ToString()
                        });
                        pointCount++;
                    }
                }
                else // line: 每個 Feature = 一個 Area
                {
                    for (int fi = 0; fi < features.Count; fi++)
                    {
                        var props = features[fi].GetProperty("properties");
                        var areaName = props.TryGetProperty("識別碼", out var idProp)
                            ? (idProp.GetString() ?? $"{pipelineName}_{fi}")
                            : $"{pipelineName}_{fi}";

                        var areaId = Guid.NewGuid();
                        await _mapDBContext.Areas.AddAsync(new Area
                        {
                            Id = areaId,
                            Name = areaName,
                            LayerId = layerId,
                            ConstructionUnit = "未填寫",
                            AdminDistId = adminDistId
                        });
                        areaCount++;

                        var coordsList = features[fi].GetProperty("geometry").GetProperty("coordinates");
                        int ptIdx = 0;
                        foreach (var coord in coordsList.EnumerateArray())
                        {
                            var (lat, lon) = Twd97ToWgs84(coord[0].GetDouble(), coord[1].GetDouble());
                            await _mapDBContext.Points.AddAsync(new Point
                            {
                                Id = Guid.NewGuid(),
                                AreaId = areaId,
                                Index = ptIdx,
                                Latitude = lat,
                                Longitude = lon,
                                Property = ptIdx == 0 ? props.ToString() : null
                            });
                            ptIdx++;
                            pointCount++;
                        }
                    }
                }

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "匯入完成", areaCount, pointCount);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (false, ex.Message, 0, 0);
            }
        }

        /// <summary>
        /// TWD97 TM2（中央經線 121°E）→ WGS84 經緯度
        /// </summary>
        private (double lat, double lon) Twd97ToWgs84(double easting, double northing)
        {
            const double a = 6378137.0;
            const double f = 1.0 / 298.257222101;
            const double k0 = 0.9999;
            const double lon0 = 121.0 * Math.PI / 180.0;
            const double E0 = 250000.0;

            double e2 = 2 * f - f * f;
            double e1 = (1 - Math.Sqrt(1 - e2)) / (1 + Math.Sqrt(1 - e2));

            double M = northing / k0;
            double mu = M / (a * (1.0 - e2 / 4.0 - 3 * e2 * e2 / 64.0 - 5 * e2 * e2 * e2 / 256.0));

            double phi1 = mu
                + (3 * e1 / 2 - 27 * Math.Pow(e1, 3) / 32) * Math.Sin(2 * mu)
                + (21 * e1 * e1 / 16 - 55 * Math.Pow(e1, 4) / 32) * Math.Sin(4 * mu)
                + (151 * Math.Pow(e1, 3) / 96) * Math.Sin(6 * mu)
                + (1097 * Math.Pow(e1, 4) / 512) * Math.Sin(8 * mu);

            double e2p = e2 / (1 - e2);
            double sinP = Math.Sin(phi1), cosP = Math.Cos(phi1), tanP = Math.Tan(phi1);
            double N1 = a / Math.Sqrt(1 - e2 * sinP * sinP);
            double T1 = tanP * tanP;
            double C1 = e2p * cosP * cosP;
            double R1 = a * (1 - e2) / Math.Pow(1 - e2 * sinP * sinP, 1.5);
            double D = (easting - E0) / (N1 * k0);
            double D2 = D * D, D3 = D2 * D, D4 = D3 * D, D5 = D4 * D, D6 = D5 * D;

            double lat = phi1 - (N1 * tanP / R1) * (
                D2 / 2
                - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2p) * D4 / 24
                + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e2p - 3 * C1 * C1) * D6 / 720);

            double lon = lon0 + (D
                - (1 + 2 * T1 + C1) * D3 / 6
                + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e2p + 24 * T1 * T1) * D5 / 120) / cosP;

            return (lat * 180.0 / Math.PI, lon * 180.0 / Math.PI);
        }

        [HttpGet("CadasMapQuery")]
        public async Task<IActionResult> CadasMapQuery(string typeCode = "B", string code = "0008")
        {
            var url = $"https://api.nlsc.gov.tw/dmaps/CadasMapQuery/{typeCode}/{code}";
            using var client = new HttpClient();
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }

        [HttpPost("Update/Category")]
        public async Task<IActionResult> UpdateCategoryAsync(Guid CateId, Guid newId)
        {
            try
            {
                var Category = await _mapDBContext.Categories.FirstAsync(c => c.Id == CateId);
                Category.ParentId = newId;
                await _mapDBContext.SaveChangesAsync();
                return Ok(new { success = true, message = "更新成功" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"更新失敗 {ex}" });
            }
        }

        [HttpGet("MapServer")]
        public async Task<IActionResult> MapServer(int No, string Token)
        {
            var url = $"https://oram-integ.tycg.gov.tw/gis/rest/services/Another/TYURS_16/MapServer/{No}?token={Token}";
            using var client = new HttpClient();
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }
    }
}
