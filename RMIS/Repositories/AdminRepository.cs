using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using CsvHelper;
using System.Globalization;
using System.IO;
using System.Collections.Generic;
using System;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.API;
using RMIS.Models.sql;
using System.Formats.Asn1;
using System.Globalization;
using CsvHelper.Configuration;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;



namespace RMIS.Repositories
{
    public class AdminRepository : AdminInterface
    {
        private readonly MapDBContext _mapDBContext;
        private readonly ILogger<AdminRepository> _logger;

        public AdminRepository(MapDBContext mapDBContext, ILogger<AdminRepository> loger)
        {
            _mapDBContext = mapDBContext;
            _logger = loger;
        }

        public async Task<AddPipelineInput> getPipelineInput()
        {
            var _Categories = await _mapDBContext.Categories.ToListAsync();
            var _GeometryTypes = await _mapDBContext.GeometryTypes.OrderBy(gt => gt.OrderId).ToListAsync();

            // 英文 Kind 對應到 中文 Key
            var kindMapping = new Dictionary<string, string>
            {
                { "point", "點" },
                { "line", "線" },
                { "plane", "面" },
                { "arrowline", "箭頭" }
            };

            // 建立 SelectListGroup 字典
            var groupDictionary = new Dictionary<string, SelectListGroup>{
                { "point", new SelectListGroup { Name = "點" } },
                { "line", new SelectListGroup { Name = "線" } },
                { "plane", new SelectListGroup { Name = "面" } },
                { "arrowline", new SelectListGroup { Name = "箭頭" } }
            };
            var input = new AddPipelineInput
            {
                Category = BuildCategorySelectList(_Categories, null),
                GeometryTypes = _GeometryTypes.Select(g =>
                {
                    return new SelectListItem
                    {
                        Text = g.Name,                 // 顯示項目名稱
                        Value = g.Kind,                // 保留英文作為 Value
                        Group = groupDictionary[g.Kind] // 群組名稱是中文
                    };
                }).ToList(),

                // 將 Keys 轉換成 SelectListItem
                KindGroup = kindMapping
                    .Select(kind => new SelectListItem
                    {
                        Text = kind.Value,
                        Value = kind.Key
                    }).ToList()
            };
            // KindGroup依照點線面
            return input;
        }

        private IEnumerable<SelectListItem> BuildCategorySelectList(IEnumerable<Category> categories, Guid? parentId, int level = 0)
        {
            // 初始化一個列表來存放結果
            var result = new List<SelectListItem>();
            // 選擇所有符合當前 parentId 的分類 (表示當前層級的父類別)
            var categoryList = categories
                .Where(c => c.ParentId == parentId).ToList();

            // 對於每個分類，繼續遞迴其子分類
            foreach (var category in categories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId))
            {
                result.Add(new SelectListItem
                {
                    Text = new string('*', level * 2) + " " + category.Name,
                    Value = category.Id.ToString()
                });
                // 然後遞迴調用，添加子分類
                var childCategories = BuildCategorySelectList(categories, category.Id, level + 1);
                result.AddRange(childCategories);  // 確保子分類緊跟在父分類後面
            }

            return result;
        }

        public async Task<int> AddPipelineAsync(AddPipelineInput pipelineInput)
        {
            var pipelineId = Guid.NewGuid();
            var pipeItem = new Pipeline
            {
                Id = pipelineId,
                Name = pipelineInput.Name,
                ManagementUnit = pipelineInput.ManagementUnit,
                // Color = pipelineInput.Color,
                CategoryId = Guid.Parse(pipelineInput.CategoryId),
                // Kind = pipelineInput.Kind
            };

            // 將新管線添加到資料庫
            await _mapDBContext.Pipelines.AddAsync(pipeItem);

            var selectedTypeId = new List<GeometryType>();
            foreach (var selectTypeId in pipelineInput.selectedGeometryTypes)
            {
                var selectedTypeGuId = Guid.Parse(selectTypeId);
                var selectedType = await _mapDBContext.GeometryTypes.FirstOrDefaultAsync(gt => gt.Id == selectedTypeGuId);
                var layerItem = new Layer
                {
                    Id = Guid.NewGuid(),
                    Name = selectedType?.Name ?? string.Empty,
                    GeometryTypeId = selectedTypeGuId,
                    PipelineId = pipelineId
                };
                await _mapDBContext.Layers.AddAsync(layerItem);
            }
            // 檢查 SaveChanges 返回值
            int rowsAffected = await _mapDBContext.SaveChangesAsync();
            return rowsAffected;
        }

        public async Task<AddRoadInput> getRoadInput()
        {
            var _AdminDists = await _mapDBContext.AdminDist.OrderBy(ad => ad.orderId).ToListAsync();
            var _Pipelines = await _mapDBContext.Pipelines.ToListAsync();
            var model = new AddRoadInput
            {
                AdminDists = _AdminDists.Select(ad => new SelectListItem
                {
                    Text = ad.City + ad.Town,
                    Value = ad.Id.ToString()
                }),
                Pipelines = _Pipelines.Select(p => new SelectListItem
                {
                    Text = buildPipelinePath(p.CategoryId) + "/" + p.Name,
                    Value = p.Id.ToString()
                })
            };
            return model;
        }

        public async Task<int> AddRoadAsync(AddRoadInput roadInput)
        {
            Guid Input_id = Guid.NewGuid();

            foreach (var point in roadInput.Points)
            {
                var new_point = new Point
                {
                    Id = Guid.NewGuid(),
                    Index = point.Index,
                    Latitude = point.Latitude,
                    Longitude = point.Longitude,
                    Property = point.Property,
                    AreaId = Input_id
                };
                await _mapDBContext.Points.AddAsync(new_point);
            }
            var areatem = new Area
            {
                Id = Input_id,
                Name = roadInput.Name,
                ConstructionUnit = roadInput.ConstructionUnit,
                AdminDistId = Guid.Parse(roadInput.AdminDistId),
                LayerId = Guid.Parse(roadInput.LayerId),
            };

            await _mapDBContext.Areas.AddAsync(areatem);
            // 檢查 SaveChanges 返回值
            int rowsAffected = await _mapDBContext.SaveChangesAsync();
            return rowsAffected;
        }
        public async Task<AddRoadByCSVInput> getRoadByCSVInput()
        {
            var _Categories = await _mapDBContext.Categories.ToListAsync();
            var _Pipelines = await _mapDBContext.Pipelines.ToListAsync();
            var model = new AddRoadByCSVInput
            {
                Pipelines = _Pipelines.Select(p => new SelectListItem
                {
                    Text = buildPipelinePath(p.CategoryId) + "/" + p.Name,
                    Value = p.Id.ToString()
                })
            };
            return model;
        }
        private string buildPipelinePath(Guid? parentId)
        {
            var parentCategory = _mapDBContext.Categories.FirstOrDefault(p => p.Id == parentId);
            if (parentCategory.ParentId == null)
            {
                return parentCategory.Name;
            }
            return buildPipelinePath(parentCategory.ParentId) + "/" + parentCategory.Name;
        }

        private class road_pile
        {
            public string road_id { get; set; }
            public string city_id { get; set; }
            public string dist_id { get; set; }
            public string road_city { get; set; }
            public string road_dist { get; set; }
            public string road_name { get; set; }
            public string road_level { get; set; }
            public string pile_id { get; set; }
            public double pile_lat { get; set; }
            public double pile_lon { get; set; }
            public string pile_dir { get; set; }
            public int pile_distance { get; set; }
            public string pile_prop { get; set; }
        }

        public async Task<int> AddRoadByCSVAsync(AddRoadByCSVInput roadByCSVInput)
        {
            if (roadByCSVInput.road_with_pile_Csv == null)
            {
                _logger.LogWarning("請提供有效的 CSV 文件。");
                return 0;
            }

            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var roadId2AreaId = new Dictionary<string, Guid>();
                var areas = new List<Area>();
                var points = new List<Point>();

                var adminDistMap = _mapDBContext.AdminDist.ToDictionary(ad => new { ad.City, ad.Town }, ad => ad.Id);
                // 讀取 road_with_pile_Csv
                using (var pileReader = new StreamReader(roadByCSVInput.road_with_pile_Csv.OpenReadStream()))
                using (var csv = new CsvReader(pileReader, CultureInfo.InvariantCulture))
                {
                    var roadpileDatas = csv.GetRecords<road_pile>().ToList();
                    var roadpileDataDistinct = roadpileDatas
                                                    .GroupBy(x => new { x.road_dist, x.road_id, x.pile_dir })
                                                    .Select(x => x.First())
                                                    .ToList();
                    foreach (var data in roadpileDataDistinct)
                    {
                        if (!adminDistMap.TryGetValue(new { City = data.road_city, Town = data.road_dist }, out var adminDistId))
                        {
                            // 如果 AdminDist 找不到，跳過或引發異常
                            var errorMessage = $"AdminDist not found for city: {data.road_city}, dist: {data.road_dist}";
                            _logger.LogError(errorMessage);
                            throw new Exception(errorMessage);
                        }
                        var areaId = Guid.NewGuid();
                        var area = new Area
                        {
                            Id = areaId,
                            Name = $"{data.road_name} - 方向 {data.pile_dir}",
                            ConstructionUnit = roadByCSVInput.ConstructionUnit,
                            AdminDistId = adminDistId,
                            LayerId = Guid.Parse(roadByCSVInput.LayerId),
                        };
                        areas.Add(area);
                        roadId2AreaId[$"{data.road_id}_{data.pile_dir}"] = areaId;
                    }

                    foreach (var data in roadpileDatas)
                    {
                        if (!roadId2AreaId.ContainsKey($"{data.road_id}_{data.pile_dir}"))
                        {
                            var errorMessage = $"Road ID {data.road_id} not found in roadId2AreaId map.";
                            _logger.LogError(errorMessage);
                            throw new Exception(errorMessage);
                        }

                        var point = new Point
                        {
                            Id = Guid.NewGuid(),
                            Index = data.pile_distance,
                            Latitude = data.pile_lat,
                            Longitude = data.pile_lon,
                            AreaId = roadId2AreaId[$"{data.road_id}_{data.pile_dir}"],
                            Property = !string.IsNullOrWhiteSpace(data.pile_prop) ? data.pile_prop : null
                        };
                        points.Add(point);
                    }
                }
                await _mapDBContext.AddRangeAsync(areas);
                var areaCount = await _mapDBContext.SaveChangesAsync();
                await _mapDBContext.AddRangeAsync(points);
                var pointCount = await _mapDBContext.SaveChangesAsync();
                if (areaCount != 0 && pointCount != 0)
                {
                    await transaction.CommitAsync();
                    _logger.LogInformation("Transaction committed successfully. Points added: {PointCount}", pointCount);
                }
                else
                {
                    await transaction.RollbackAsync();
                    _mapDBContext.ChangeTracker.Clear();
                    var errorMessage = "No rows were affected during SaveChanges.";
                    _logger.LogError(errorMessage);
                    throw new Exception(errorMessage);
                }
                return pointCount;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "An error occurred while adding roads by CSV.");
                throw;
            }
        }
        public async Task<AddCategoryInput> getCategoryInput()
        {
            var parentCategories = await _mapDBContext.Categories.ToListAsync();
            var CategoryInput = new AddCategoryInput
            {
                parentCategories = BuildCategorySelectList(parentCategories, null)
            };

            return CategoryInput;
        }

        public async Task<int> AddCategoryAsync(AddCategoryInput categoryInput)
        {
            var category = new Category
            {
                Id = Guid.NewGuid(),
                Name = categoryInput.Name,
                ParentId = categoryInput.ParentId == null ? null : Guid.Parse(categoryInput.ParentId),
                OrderId = _mapDBContext.Categories.Count(c => c.ParentId.ToString() == categoryInput.ParentId) + 1
            };
            await _mapDBContext.Categories.AddAsync(category);
            int rowsAffected = await _mapDBContext.SaveChangesAsync();
            return rowsAffected;
        }

        public async Task<int> AddMapSourceAsync(AddMapSourceInput mapsourceInput)
        {
            var mapsource = new MapSource
            {
                Url = mapsourceInput.Url,
                SourceId = mapsourceInput.SourceId,
                Name = mapsourceInput.Name,
                Type = mapsourceInput.Type,
                TileType = mapsourceInput.TileType,
                ImageFormat = mapsourceInput.ImageFormat,
                Attribution = mapsourceInput.Attribution
            };
            await _mapDBContext.MapSources.AddAsync(mapsource);
            int rowsAffected = await _mapDBContext.SaveChangesAsync();
            return rowsAffected;
        }

        public async Task<(int categoryCount, int pipelineCount)> AddCategoryByJsonAsync(JObject jObject)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var categories = new List<Category>();
                var pipelines = new List<Pipeline>();
                var layers = new List<Layer>();
                var geometryTypes = new List<GeometryType>();

                var count = await _mapDBContext.Categories.CountAsync(c => c.ParentId == null) + 1;

                foreach (var category in jObject.Properties())
                {
                    var id = Guid.NewGuid();
                    var newCategory = new Category
                    {
                        Id = id,
                        Name = category.Name,
                        ParentId = null,
                        OrderId = count
                    };
                    count++;
                    categories.Add(newCategory);

                    // 处理子类别和管道
                    var success = await ProcessCategoryJsonAsync(category.Value, id, categories, pipelines, layers, geometryTypes);
                    if (!success)
                    {
                        await transaction.RollbackAsync();
                        return (-1, -1);
                    }
                }

                // 批量插入所有收集的实体
                if (categories.Any())
                {
                    await _mapDBContext.Categories.AddRangeAsync(categories);
                }
                if (pipelines.Any())
                {
                    await _mapDBContext.Pipelines.AddRangeAsync(pipelines);
                }
                if (geometryTypes.Any())
                {
                    // 排除已经存在的 GeometryTypes，防止重复插入
                    var existingNames = _mapDBContext.GeometryTypes
                        .Where(gt => geometryTypes.Select(g => g.Name).Contains(gt.Name))
                        .Select(gt => gt.Name)
                        .ToHashSet();

                    var newGeometryTypes = geometryTypes.Where(g => !existingNames.Contains(g.Name)).ToList();
                    if (newGeometryTypes.Any())
                    {
                        await _mapDBContext.GeometryTypes.AddRangeAsync(newGeometryTypes);
                    }
                }
                if (layers.Any())
                {
                    await _mapDBContext.Layers.AddRangeAsync(layers);
                }

                // 保存更改
                int rowsAffected = await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (categories.Count, pipelines.Count);
            }
            catch
            {
                await transaction.RollbackAsync();
                return (-1, -1);
            }
        }

        private async Task<bool> ProcessCategoryJsonAsync(
            JToken categorys,
            Guid parentId,
            List<Category> categories,
            List<Pipeline> pipelines,
            List<Layer> layers,
            List<GeometryType> geometryTypes)
        {
            try
            {
                // jObject为Category
                if (categorys is JObject jObject)
                {
                    var count = 0;
                    foreach (var category in jObject.Properties())
                    {
                        // 新增子類別
                        var id = Guid.NewGuid();
                        var newCategory = new Category
                        {
                            Id = id,
                            Name = category.Name,
                            ParentId = parentId,
                            OrderId = count
                        };
                        count++;
                        categories.Add(newCategory);

                        _logger.LogInformation("Added Category: {Name}, ParentId: {ParentId}", category.Name, parentId);

                        // 遞歸處理子類別
                        var success = await ProcessCategoryJsonAsync(category.Value, id, categories, pipelines, layers, geometryTypes);
                        if (!success)
                        {
                            return false;
                        }
                    }
                }
                else if (categorys is JArray jArray)
                {
                    foreach (var item in jArray)
                    {
                        // 新增Pipeline
                        var pipelineId = Guid.NewGuid();
                        var newPipeline = new Pipeline
                        {
                            Id = pipelineId,
                            Name = item["名稱"].ToString(),
                            ManagementUnit = item["管理單位"].ToString(),
                            // Kind = item["種類"].ToString(),
                            // Color = item["顏色"].ToString(),
                            
                            CategoryId = parentId
                        };
                        pipelines.Add(newPipeline);

                        _logger.LogInformation("Added Pipeline: {Name}, ParentId: {ParentId}", newPipeline.Name, parentId);

                        //  "屬性": {
                        //     "租借日期(一個月內)" : "箭頭(棕)",
                        //     "租借日期(一周內)" : "箭頭(棕黃)"
                        //     }
                        foreach (var prop in item["屬性"].ToObject<JObject>())
                        {
                            var propName = prop.Key;
                            var propValue = prop.Value.ToString();
                            var existingGeometryType = geometryTypes.FirstOrDefault(g => g.Name == propValue)
                                ?? _mapDBContext.GeometryTypes.FirstOrDefault(gt => gt.Name == propValue);

                            Guid geometryTypeId;

                            // 如果GeometryType不存在
                            if (existingGeometryType == null)
                            {
                                // 新增GeometryType
                                geometryTypeId = Guid.NewGuid();
                                var newGeometryType = new GeometryType
                                {
                                    Id = geometryTypeId,
                                    Name = propValue,
                                    Svg = "",
                                    OrderId = geometryTypes.Count + 1,
                                    Kind = "point"
                                };
                                geometryTypes.Add(newGeometryType);

                                _logger.LogInformation("Added GeometryType: {Name}", newGeometryType.Name);
                            }
                            else
                            {
                                geometryTypeId = existingGeometryType.Id;
                            }

                            // 新增Layer
                            var newLayer = new Layer
                            {
                                Id = Guid.NewGuid(),
                                Name = propName,
                                GeometryTypeId = geometryTypeId,
                                PipelineId = pipelineId
                            };
                            layers.Add(newLayer);

                            _logger.LogInformation("Added Layer: {Name}, PipelineId: {PipelineId}", newLayer.Name, pipelineId);
                        }
                    }
                }
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in ProcessCategoryJsonAsync. ParentId: {ParentId}", parentId);
                return false;
            }
        }
        public async Task<int> DeletePipelineAsync(Guid? pipelineId)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                int rowsAffected = 0;

                // 删除 Pipeline
                if (pipelineId.HasValue)
                {
                    // 删除 Pipeline 下的 Layers
                    var layersToDelete = _mapDBContext.Layers.Where(l => l.PipelineId == pipelineId.Value);
                    foreach (var layer in layersToDelete)
                    {
                        // 刪除 Layer 下的 Areas
                        var areasToDelete = _mapDBContext.Areas.Where(a => a.LayerId == layer.Id);
                        foreach (var area in areasToDelete)
                        {
                            // 刪除 Areas 下的 Points
                            var pointsToDelete = _mapDBContext.Points.Where(p => p.AreaId == area.Id);
                            _mapDBContext.Points.RemoveRange(pointsToDelete);
                        }
                        _mapDBContext.Areas.RemoveRange(areasToDelete);
                    }
                    _mapDBContext.Layers.RemoveRange(layersToDelete);
                    // 删除 Pipeline
                    var pipelineToDelete = await _mapDBContext.Pipelines.FindAsync(pipelineId.Value);
                    if (pipelineToDelete != null)
                    {
                        _mapDBContext.Pipelines.Remove(pipelineToDelete);
                    }
                }

                rowsAffected += await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return rowsAffected;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        public async Task<int> DeleteCategoryAsync(Guid? categoryId)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                int rowsAffected = 0;

                if (categoryId.HasValue)
                {
                    // 遞迴刪除子類別
                    await DeleteCategoryRecursiveAsync(categoryId.Value);

                    // 删除目前 Category
                    var categoryToDelete = await _mapDBContext.Categories.FindAsync(categoryId.Value);
                    if (categoryToDelete != null)
                    {
                        _mapDBContext.Categories.Remove(categoryToDelete);
                    }
                    rowsAffected += await _mapDBContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                return rowsAffected;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        public async Task<int> DeleteLayerDataAsync(Guid? layerId)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                int rowsAffected = 0;
                if(layerId.HasValue){
                    // 取得Layer的Areas
                    var areasToDelete = await getAreasToDeleteAsync(layerId.Value);
                    foreach (var area in areasToDelete)
                    {
                        // 取得Area的Points
                        var pointsToDelete = await getPointsToDeleteAsync(area.Id);
                        _mapDBContext.Points.RemoveRange(pointsToDelete);
                    }
                    _mapDBContext.Areas.RemoveRange(areasToDelete);
                    rowsAffected = await _mapDBContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                return rowsAffected;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task DeleteCategoryRecursiveAsync(Guid parentId)
        {
            var pipelines = new List<Pipeline>();
            var layers = new List<Layer>();
            var areas = new List<Area>();
            var points = new List<Point>();
            // 獲得子類別
            var childCategories = _mapDBContext.Categories.Where(c => c.ParentId == parentId).ToList();

            foreach (var childCategory in childCategories)
            {
                // 遞迴刪除子類別
                await DeleteCategoryRecursiveAsync(childCategory.Id);
            }

            // 取得當前類别的 Pipelines
            var pipelinesToDelete = await getPipelinesToDeleteAsync(parentId);
            foreach (var pipeline in pipelinesToDelete)
            {
                // 取得 Pipeline 的 Layers
                var layersToDelete = await getLayersToDeleteAsync(pipeline.Id);
                foreach (var layer in layersToDelete)
                {
                    // 取得 Layer 的 Areas
                    var areasToDelete = await getAreasToDeleteAsync(layer.Id);
                    foreach (var area in areasToDelete)
                    {
                        // 取得 Area 的 Points
                        var pointsToDelete = await getPointsToDeleteAsync(area.Id);
                        points.AddRange(pointsToDelete);
                    }
                    areas.AddRange(areasToDelete);
                }
                layers.AddRange(layersToDelete);
            }
            pipelines.AddRange(pipelinesToDelete);
            _mapDBContext.Points.RemoveRange(points);
            _mapDBContext.Areas.RemoveRange(areas);
            _mapDBContext.Layers.RemoveRange(layers);
            _mapDBContext.Pipelines.RemoveRange(pipelines);
            _mapDBContext.Categories.RemoveRange(childCategories);
        }

        private async Task<List<Point>> getPointsToDeleteAsync(Guid areaId)
        {
            var pointsToDelete = await _mapDBContext.Points.Where(p => p.AreaId == areaId).ToListAsync();
            return pointsToDelete;
        }

        private async Task<List<Area>> getAreasToDeleteAsync(Guid layerId)
        {
            var areasToDelete = await _mapDBContext.Areas.Where(p => p.LayerId == layerId).ToListAsync();
            return areasToDelete;
        }

        private async Task<List<Layer>> getLayersToDeleteAsync(Guid pipelineId)
        {
            var layersToDelete = await _mapDBContext.Layers.Where(l => l.PipelineId == pipelineId).ToListAsync();
            return layersToDelete;
        }

        private async Task<List<Pipeline>> getPipelinesToDeleteAsync(Guid categoryId)
        {
            var pipelinesToDelete = await _mapDBContext.Pipelines.Where(p => p.CategoryId == categoryId).ToListAsync();
            return pipelinesToDelete;
        }

        private async Task<List<Category>> getCategoriesToDeleteAsync(Guid parentId)
        {
            var categoriesToDelete = await _mapDBContext.Categories.Where(c => c.ParentId == parentId).ToListAsync();
            return categoriesToDelete;
        }

        public async Task<List<string>> GetFlaggedPipelinesAsync()
        {
            var flaggedPipelines = await _mapDBContext.Pipelines
                .Where(p => p.Name.Contains("權管土地"))
                .Select(p => p.Id.ToString())
                .ToListAsync();
            return flaggedPipelines;
        }

        public async Task<List<string>> GetFocusedPipelinesAsync(int selectType)
        {
            // 0: 臨時道路借用申請(路線)、臨時道路借用申請(借用範團)
            // 1: 臨時道路借用申請(路線)
            // 2: 臨時道路借用申請(借用範圍)
            var focusedPipelines = new List<string>();
            if (selectType == 0)
            {
                focusedPipelines = await _mapDBContext.Pipelines
                    .Where(p => p.Name.Contains("臨時道路借用申請(路線)") || p.Name.Contains("臨時道路借用申請(借用範團)"))
                    .Select(p => p.Id.ToString())
                    .ToListAsync();
            }
            else if (selectType == 1)
            {
                focusedPipelines = await _mapDBContext.Pipelines
                    .Where(p => p.Name.Contains("臨時道路借用申請(借用範團)"))
                    .Select(p => p.Id.ToString())
                    .ToListAsync();
            }
            else if (selectType == 2)
            {
                focusedPipelines = await _mapDBContext.Pipelines
                    .Where(p => p.Name.Contains("臨時道路借用申請(路線)"))
                    .Select(p => p.Id.ToString())
                    .ToListAsync();
            }
            return focusedPipelines;
        }

        public async Task<int> AddRoadRrojectByCSVAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                throw new Exception("請提供有效的 CSV 文件。");
            }

            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                using (var reader = new StreamReader(file.OpenReadStream()))
                using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
                {
                    csv.Context.RegisterClassMap<RoadProjectMap>();
                    var roadProjects = csv.GetRecords<RoadProject>().ToList();
                    var projectAreas = new List<Area>();
                    var projectPoints = new List<Point>();
                    for(int i = 0; i < roadProjects.Count; i++)
                    {
                        roadProjects[i].Id = Guid.NewGuid();
                        // 將roadProjects[i]轉成json字串
                        var projectProp = JsonConvert.SerializeObject(roadProjects[i]);
                        // 新增起訖位置-預拓範圍和起訖位置-街景照片的area
                        var startEndLocation = roadProjects[i].StartEndLocation;
                        var adminDistId = _mapDBContext.AdminDist.FirstOrDefault(ad => ad.Town == roadProjects[i].AdministrativeDistrict)?.Id;
                        var rangeId = Guid.NewGuid();
                        var rangeArea = new Area
                        {
                            Id = rangeId,
                            Name = $"{startEndLocation} - 預拓範圍",
                            ConstructionUnit = "工務局",
                            AdminDistId = adminDistId ?? Guid.Empty,
                            LayerId = Guid.Parse("DB7B29A6-DF4D-4CA4-9EB7-465F9809CA0A")
                        };
                        var rangeList = JsonConvert.DeserializeObject<List<string>>(roadProjects[i].PlannedExpansionRange);
                        var rangePoints = await addRangePointsAsync(rangeId, rangeList, projectProp);
                        projectPoints.AddRange(rangePoints);
                        projectAreas.Add(rangeArea);

                        var photoId = Guid.NewGuid();
                        var photoArea = new Area
                        {
                            Id = photoId,
                            Name = $"{startEndLocation} - 街景照片",
                            ConstructionUnit = "工務局",
                            AdminDistId = adminDistId ?? Guid.Empty,
                            LayerId = Guid.Parse("DB7B29A6-DF4D-4CA4-9EB7-465F9809CA0A")
                        };
                        var photoDict = JsonConvert.DeserializeObject<Dictionary<string, string>>(roadProjects[i].StreetViewPhotos);
                        var photoPoints = await addPhotoPointsAsync(photoId, photoDict);
                        projectPoints.AddRange(photoPoints);
                        projectAreas.Add(photoArea);

                        roadProjects[i].PlannedExpansionId = rangeId;
                        roadProjects[i].StreetViewId = photoId;
                    };
                    await _mapDBContext.AddRangeAsync(projectAreas);
                    await _mapDBContext.SaveChangesAsync();
                    await _mapDBContext.AddRangeAsync(projectPoints);
                    await _mapDBContext.SaveChangesAsync();
                    await _mapDBContext.AddRangeAsync(roadProjects);
                    int rowsAffected = await _mapDBContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return rowsAffected;
                }            
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "An error occurred while adding road projects by CSV.");
                throw;
            }
        }

        // rangePoints: ["24.949975, 121.225981", "24.949483, 121.226059", "24.949483, 121.226059", "24.950167, 121.226609"]
        private async Task<List<Point>> addRangePointsAsync(Guid areaId, List<string> rangePoints, string projectProp)
        {
            var points = new List<Point>();
            for (int i = 0; i < rangePoints.Count; i++)
            {
                var point = rangePoints[i].Split(",");
                var newPoint = new Point
                {
                    Id = Guid.NewGuid(),
                    Index = i,
                    Latitude = double.Parse(point[0]),
                    Longitude = double.Parse(point[1]),
                    AreaId = areaId
                };
                points.Add(newPoint);
            }
            points[0].Property = projectProp;
            return points;
        }
        // RoadProject資料映射
        
        // photoPoints: {"01.png":"24.950000, 121.225928","02.png":"24.950170, 121.226626"}
        private async Task<List<Point>> addPhotoPointsAsync(Guid areaId, Dictionary<string, string> photoPoints)
        {
            var points = new List<Point>();
            var i = 0;
            foreach (var photoPoint in photoPoints)
            {
                var coordinate = photoPoint.Value.Split(",");
                var point = new Point
                {
                    Id = Guid.NewGuid(),
                    Index = i,
                    Latitude = double.Parse(coordinate[0]),
                    Longitude = double.Parse(coordinate[1]),
                    AreaId = areaId,
                    Property = photoPoint.Key
                };
                points.Add(point);
                i += 1;
            }
            return points;
        }

        public async Task<List<RoadProject>> GetProjectByAsync(getRoadProjectInput data)
        {

            //var roadProjects = await _mapDBContext.RoadProjects
            //    .Where(rp => rp.AdministrativeDistrict == adminDist && rp.TotalBudget >= startBudget && rp.TotalBudget <= endBudget)
            //    .ToListAsync();

            var query = _mapDBContext.RoadProjects.AsQueryable();
            // 行政區
            if (!string.IsNullOrEmpty(data.AdminDistrict))
            {
                query = query.Where(rp => rp.AdministrativeDistrict == data.AdminDistrict);
            }

            // 起點(模糊搜尋)
            if (!string.IsNullOrEmpty(data.StartPoint))
            {
                query = query.Where(rp => rp.StartPoint.Contains(data.StartPoint));
            }
            
            // 終點(模糊搜尋)
            if (!string.IsNullOrEmpty(data.EndPoint))
            {
                query = query.Where(rp => rp.EndPoint.Contains(data.EndPoint));
            }
  
            // 現況路寬(開頭查詢)
            if (data.CurrentRoadWidth != null)
            {
                var roadWidth = data.CurrentRoadWidth.ToString();
                query = query.Where(rp => rp.CurrentRoadWidth.StartsWith(roadWidth));
            }

            // 道路長度
            if (data.RoadLength != null)
            {
                var roadLength = data.RoadLength.Value;
                query = query.Where(rp => rp.RoadLength == roadLength);
            }

            // 工程經費
            if (data.Budgets?.ProjectBudget?.Value != null)
            {
                var projectBudget = data.Budgets.ProjectBudget.Value * 10000;
                switch (data.Budgets.ProjectBudget.Option)
                {
                    case "1": // 大於
                        query = query.Where(rp => rp.ConstructionBudget > projectBudget);
                        break;
                    case "2": // 小於
                        query = query.Where(rp => rp.ConstructionBudget < projectBudget);
                        break;
                    case "3": // 等於
                        query = query.Where(rp => rp.ConstructionBudget == projectBudget);
                        break;
                }
            }

            // 用地經費
            if (data.Budgets?.LandBudget?.Value != null)
            {
                var landBudget = data.Budgets.LandBudget.Value * 10000;
                switch (data.Budgets.LandBudget.Option)
                {
                    case "1": // 大於
                        query = query.Where(rp => rp.LandAcquisitionBudget > landBudget);
                        break;
                    case "2": // 小於
                        query = query.Where(rp => rp.LandAcquisitionBudget < landBudget);
                        break;
                    case "3": // 等於
                        query = query.Where(rp => rp.LandAcquisitionBudget == landBudget);
                        break;
                }
            }

            // 補償經費
            if (data.Budgets?.CompensationBudget?.Value != null)
            {
                var compensationBudget = data.Budgets.CompensationBudget.Value * 10000;
                switch (data.Budgets.CompensationBudget.Option)
                {
                    case "1": // 大於
                        query = query.Where(rp => rp.CompensationBudget > compensationBudget);
                        break;
                    case "2": // 小於
                        query = query.Where(rp => rp.CompensationBudget < compensationBudget);
                        break;
                    case "3": // 等於
                        query = query.Where(rp => rp.CompensationBudget == compensationBudget);
                        break;
                }
            }

            // 合計經費(範圍在start與end之間)
            if (data.Budgets?.TotalBudgetRange?.Start != null && data.Budgets.TotalBudgetRange.End != null)
            {
                var startBudget = data.Budgets.TotalBudgetRange.Start * 10000;
                var endBudget = data.Budgets.TotalBudgetRange.End * 10000;
                query = query.Where(rp => rp.TotalBudget >= startBudget && rp.TotalBudget <= endBudget);
            }

            return await query.Select(rp => new RoadProject
            {
                Id = rp.Id,
                ProjectId = rp.ProjectId,
                Proposer = rp.Proposer,
                AdministrativeDistrict = rp.AdministrativeDistrict,
                StartPoint = rp.StartPoint,
                EndPoint = rp.EndPoint,
                StartEndLocation = rp.StartEndLocation,
                RoadLength = rp.RoadLength,
                CurrentRoadWidth = rp.CurrentRoadWidth,
                PlannedRoadWidth = rp.PlannedRoadWidth,
                PublicLand = rp.PublicLand,
                PrivateLand = rp.PrivateLand,
                PublicPrivateLand = rp.PublicPrivateLand,
                ConstructionBudget = rp.ConstructionBudget,
                LandAcquisitionBudget = rp.LandAcquisitionBudget,
                CompensationBudget = rp.CompensationBudget,
                TotalBudget = rp.TotalBudget,
                PlannedExpansionRange = rp.PlannedExpansionRange,
                StreetViewPhotos = rp.StreetViewPhotos,
                Remarks = rp.Remarks,
                PlannedExpansionId = rp.PlannedExpansionId,
                StreetViewId = rp.StreetViewId
            }).OrderBy(rp => rp.ProjectId).ToListAsync();
        }

        public class RoadProjectMap : ClassMap<RoadProject>
        {
            public RoadProjectMap()
            {
                Map(m => m.ProjectId).Name("專案代號");
                Map(m => m.Proposer).Name("提案人");
                Map(m => m.AdministrativeDistrict).Name("行政區");
                Map(m => m.StartPoint).Name("起點");
                Map(m => m.EndPoint).Name("終點");
                Map(m => m.StartEndLocation).Name("起訖位置");
                Map(m => m.RoadLength).Name("道路長度").Convert(row => ParseLength(row.Row["道路長度"]));
                Map(m => m.CurrentRoadWidth).Name("現況路寬");
                Map(m => m.PlannedRoadWidth).Name("計畫路寬");
                Map(m => m.PublicLand).Name("公有土地");
                Map(m => m.PrivateLand).Name("私有土地");
                Map(m => m.PublicPrivateLand).Name("公私土地");
                Map(m => m.ConstructionBudget).Name("工程經費").Convert(row => ParseCurrency(row.Row["工程經費"]));
                Map(m => m.LandAcquisitionBudget).Name("用地經費").Convert(row => ParseCurrency(row.Row["用地經費"]));
                Map(m => m.CompensationBudget).Name("補償經費").Convert(row => ParseCurrency(row.Row["補償經費"]));
                Map(m => m.TotalBudget).Name("合計經費").Convert(row => ParseCurrency(row.Row["合計經費"]));
                Map(m => m.PlannedExpansionRange).Name("預拓範圍");
                Map(m => m.StreetViewPhotos).Name("街景照片");
                Map(m => m.Remarks).Name("備註");
            }

            private static int ParseLength(string value)
            {
                if (string.IsNullOrWhiteSpace(value))
                    return 0; // 空值或空白直接返回 0

                value = value.Replace("公尺", "").Trim(); // 移除單位並去除前後空格

                // 嘗試解析為整數
                if (int.TryParse(value, out var result))
                {
                    return result;
                }

                return 0; // 如果解析失敗，返回 0
            }

            private static int ParseCurrency(string value)
            {
                if (string.IsNullOrWhiteSpace(value)) return 0;
                value = value.Replace("萬", "").Trim();
                if (int.TryParse(value, out var result))
                {
                    return result * 10000; // 將萬元轉換為元
                }
                return 0;
            }
        }

        public async Task<PointsByProjectId> GetPointsByProjectIdAsync(Guid projectId)
        {   // 取得PlannedExpansionId與StreetViewId
            var project = await _mapDBContext.RoadProjects
                .Where(rp => rp.Id == projectId)
                .FirstOrDefaultAsync();
            // 取得PlannedExpansionId與StreetViewId的Points
            var rangePoints = await _mapDBContext.Points
                .Where(p => p.AreaId == project.PlannedExpansionId)
                .Select(p => new rangeCoordinate
                {
                    Index = p.Index,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Prop = p.Property
                }).OrderBy(p => p.Index).ToListAsync();

            var photoPoints = await _mapDBContext.Points
                .Where(p => p.AreaId == project.StreetViewId)
                .Select(p => new photoCoordinate
                {
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    url = p.Property
                }).ToListAsync();

            var result = new PointsByProjectId
            {
                rangePoints = rangePoints,
                photoPoints = photoPoints
            };
            return result;
        }

        public async Task<int> AddRoadProjectAsync(AddRoadProjectInput roadProjectInput)
        {
            using var transaction = _mapDBContext.Database.BeginTransaction();
            try
            {
                var adminDistId = _mapDBContext.AdminDist.FirstOrDefault(ad => ad.Town == roadProjectInput.AdminDistrict)?.Id;
                var startEndLocation = roadProjectInput.StartPoint + "至" + roadProjectInput.EndPoint;

                // 新增RoadProject
                var roadProject = new RoadProject
                {
                    Id = Guid.NewGuid(),
                    // ProjectId為總數+1
                    ProjectId = _mapDBContext.RoadProjects.Count() + 1,
                    Proposer = roadProjectInput.Proposer,
                    AdministrativeDistrict = roadProjectInput.AdminDistrict,
                    StartPoint = roadProjectInput.StartPoint,
                    EndPoint = roadProjectInput.EndPoint,
                    StartEndLocation = startEndLocation,
                    RoadLength = roadProjectInput.RoadLength,
                    CurrentRoadWidth = $"{roadProjectInput.CurrentRoadWidth} | {roadProjectInput.CurrentRoadType}",
                    PlannedRoadWidth = $"{roadProjectInput.PlannedRoadWidth} | {roadProjectInput.PlannedRoadType}",
                    PublicLand = roadProjectInput.PublicLand,
                    PrivateLand = roadProjectInput.PrivateLand,
                    PublicPrivateLand = roadProjectInput.PublicPrivateLand,
                    ConstructionBudget = roadProjectInput.ConstructionBudget * 10000,
                    LandAcquisitionBudget = roadProjectInput.LandBudget * 10000,
                    CompensationBudget = roadProjectInput.CompensationBudget * 10000,
                    TotalBudget = roadProjectInput.TotalBudget * 10000,
                    Remarks = roadProjectInput.Remark
                };

                var expansionId = Guid.NewGuid();
                // roadProject 轉換成json
                var projectProp = JsonConvert.SerializeObject(roadProject);
                //新增expansionArea area
                var expansionArea = new Area
                {
                    Id = expansionId,
                    Name = $"{startEndLocation} - 預拓範圍",
                    ConstructionUnit = "工務局",
                    AdminDistId = adminDistId ?? Guid.Empty,
                    LayerId = Guid.Parse("DB7B29A6-DF4D-4CA4-9EB7-465F9809CA0A")
                };
                //新增photo area
                var rangeList = roadProjectInput.ExpansionRange;
                Console.WriteLine("Before addExpansion: {ExpansionRange}", JsonConvert.SerializeObject(roadProjectInput.ExpansionRange));
                var expansionPoints = await addExpansion(expansionId, roadProjectInput.ExpansionRange, projectProp);
                Console.WriteLine("After addExpansion: {ExpansionRange}", JsonConvert.SerializeObject(roadProjectInput.ExpansionRange));
                var photoId = Guid.NewGuid();
                var photoArea = new Area
                {
                    Id = photoId,
                    Name = $"{startEndLocation} - 街景照片",
                    ConstructionUnit = "工務局",
                    AdminDistId = adminDistId ?? Guid.Empty,
                    LayerId = Guid.Parse("DB7B29A6-DF4D-4CA4-9EB7-465F9809CA0A")
                };

                var photoPoints = addPhoto(photoId, roadProjectInput.StreetViewPhoto);

                 _mapDBContext.Areas.Add(expansionArea);
                 _mapDBContext.SaveChanges();
                 _mapDBContext.AddRange(expansionPoints);
                 _mapDBContext.SaveChanges();

                 _mapDBContext.Areas.Add(photoArea);
                 _mapDBContext.SaveChanges();
                 _mapDBContext.AddRange(photoPoints);
                 _mapDBContext.SaveChanges();

                roadProject.PlannedExpansionId = expansionId;
                roadProject.StreetViewId = photoId;
                 _mapDBContext.RoadProjects.AddAsync(roadProject);
                var rowsAffected = _mapDBContext.SaveChanges();
                transaction.Commit();
                return rowsAffected;
            }
            catch (Exception ex)
            {
                 transaction.RollbackAsync();
                _logger.LogError(ex, "An error occurred while adding road projects by CSV.");
                throw;
            }

        }

        private async Task<List<Point>> addExpansion(Guid areaId, List<range> rangeList, string projectProp)
        {
            var points = new List<Point>();
            for (int i = 0; i < rangeList.Count; i++)
            {
                var newPoint = new Point
                {
                    Id = Guid.NewGuid(),
                    Index = i,
                    Latitude = rangeList[i].Latitude,
                    Longitude = rangeList[i].Longitude,
                    AreaId = areaId,
                };
                points.Add(newPoint);
            }
            points[0].Property = projectProp;
            return points;
        }

        private List<Point> addPhoto(Guid areaId, List<photo> photoList)
        {
            var points = new List<Point>();
            for (var i = 0; i < photoList.Count; i++)
            {
                savePhoto(photoList[i].Photo, photoList[i].PhotoName);
                var newPoint = new Point
                {
                    Id = Guid.NewGuid(),
                    Index = i,
                    Latitude = photoList[i].Latitude,
                    Longitude = photoList[i].Longitude,
                    AreaId = areaId,
                    Property = photoList[i].PhotoName
                };
            };
            return points;
        }

        private void savePhoto(string photo, string photoName)
        {
            
            // 提取 Base64 字串（移除開頭的 data:image/png;base64, 部分）
            var base64Data = Regex.Replace(photo, @"^data:image/\w+;base64,", string.Empty);

            // 將 Base64 字串轉換為 byte[]
            var imageBytes = Convert.FromBase64String(base64Data);

            // 儲存路徑（伺服器上的某個目錄）
            var savePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "img");
            if (!Directory.Exists(savePath))
            {
                Directory.CreateDirectory(savePath);
            }

            // 儲存檔案名稱
            var fileName = $"{photoName}";
            var filePath = Path.Combine(savePath, fileName);

            // 將 byte[] 寫入檔案
            System.IO.File.WriteAllBytes(filePath, imageBytes);
        }
    }
}
