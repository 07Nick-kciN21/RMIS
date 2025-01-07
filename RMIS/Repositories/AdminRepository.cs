using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using CsvHelper;
using System.Globalization;
using System.IO;
using System.Collections.Generic;
using System.Formats.Asn1;
using System.Globalization;
using System;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.API;
using RMIS.Models.sql;
using RMIS.Utils;
using OfficeOpenXml;
using CsvHelper.Configuration;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using AutoMapper.QueryableExtensions;




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
            var mapsource = MapperHelper.A2B<AddMapSourceInput, MapSource>(mapsourceInput);
            //var config = new MapperConfiguration(cfg => cfg.CreateMap<AddMapSourceInput, MapSource>());
            //var mapper = config.CreateMapper();
            // var mapsource = mapper.Map<MapSource>(mapsourceInput);
            // var mapsource = new MapSource
            //{
            //    Url = mapsourceInput.Url,
            //    SourceId = mapsourceInput.SourceId,
            //    Name = mapsourceInput.Name,
            //    Type = mapsourceInput.Type,
            //    TileType = mapsourceInput.TileType,
            //    ImageFormat = mapsourceInput.ImageFormat,
            //    Attribution = mapsourceInput.Attribution
            //};
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

        public async Task<int> AddRoadRrojectByExcelAsync(AddRoadProjectByExcelInput input)
        {
            var file = input.projectFile;
            var photoFile = input.projectPhoto;
            if (file == null || file.Length == 0)
            {
                throw new Exception("請提供有效的 xlsx 文件。");
            }
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                int rowsAffected = 0;
                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
                    using (var package = new ExcelPackage(stream))
                    {
                        var roadProjectSheet = package.Workbook.Worksheets[0];
                        var roadProjects = ParseRoadProjectExcel(roadProjectSheet);

                        var projectAreas = new List<Area>();
                        var projectPoints = new List<Point>();
                        for(int i=0; i<roadProjects.Count; i++)
                        {
                            roadProjects[i].Id = Guid.NewGuid();
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
                            var rangePoints = await addRangePointsAsync(rangeId, rangeList, roadProjects[i]);
                            projectPoints.AddRange(rangePoints);
                            projectAreas.Add(rangeArea);

                            var photoId = Guid.NewGuid();
                            var photoArea = new Area
                            {
                                Id = photoId,
                                Name = $"{startEndLocation} - 街景照片",
                                ConstructionUnit = "工務局",
                                AdminDistId = adminDistId ?? Guid.Empty,
                                LayerId = Guid.Parse("C155F3E2-42B6-4004-97C2-05E1C0EFC0E0")
                            };
                            var photoDict = JsonConvert.DeserializeObject<Dictionary<string, string>>(roadProjects[i].StreetViewPhotos);

                            var photoPoints = await addPhotoPointsAsync(roadProjects[i].ProjectId, photoId, photoDict);
                            projectPoints.AddRange(photoPoints);
                            projectAreas.Add(photoArea);

                            roadProjects[i].PlannedExpansionId = rangeId;
                            roadProjects[i].StreetViewId = photoId;
                        };
                        // roadProjects轉換成RoadProject型態
                        var roadProjectList = MapperHelper.A2B<List<RoadProjectExcelFormat>, List<RoadProject>>(roadProjects);
                        //var config = new MapperConfiguration(cfg => cfg.CreateMap<RoadProjectExcelFormat, RoadProject>());
                        //var mapper = config.CreateMapper();
                        //var roadProjectList = mapper.Map<List<RoadProject>>(roadProjects);

                        await _mapDBContext.AddRangeAsync(projectAreas);
                        await _mapDBContext.SaveChangesAsync();
                        await _mapDBContext.AddRangeAsync(projectPoints);
                        await _mapDBContext.SaveChangesAsync();
                        await _mapDBContext.AddRangeAsync(roadProjectList);
                        rowsAffected = await _mapDBContext.SaveChangesAsync();
                        await transaction.CommitAsync();
                    }
                }

                for(int i = 0; i < photoFile.Count; i++)
                {
                    await savePhotoFileAsync(photoFile[i]);
                }
                return rowsAffected;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "An error occurred while adding road projects by CSV.");
                throw;
            }
        }

        // rangePoints: ["24.949975, 121.225981", "24.949483, 121.226059", "24.949483, 121.226059", "24.950167, 121.226609"]
        private async Task<List<Point>> addRangePointsAsync(Guid areaId, List<string> rangePoints, RoadProjectExcelFormat projectExcel)
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
            // ["現況路寬"]可能格式
            // projectProp["現況路寬"] = "未開闢"
            // projectProp["現況路寬"] = "6公尺、未開闢"
            // projectProp["現況路寬"] = "6公尺|未開闢"

            // 使用正則表達式取出公尺的數值，以及符號後面的路況類別
            // 如果公尺不存在、則以0代替
            // 如果路況類別不存在、則以"未開闢"代替

            // 使用正則表達式解析路寬與路況類別
            // 使用正則表達式解析路寬與路況類別
            var parseRoadWidth = (string roadWidthStr) =>
            {
                int width = 0;
                string condition = "未開闢";

                // 匹配公尺數值
                var roadWidthMatch = System.Text.RegularExpressions.Regex.Match(roadWidthStr, "(\\d+)公尺");
                if (roadWidthMatch.Success)
                {
                    width = int.Parse(roadWidthMatch.Groups[1].Value);
                }

                // 匹配路況類別
                var roadConditionMatch = System.Text.RegularExpressions.Regex.Match(roadWidthStr, "[、|](.*)");
                if (roadConditionMatch.Success)
                {
                    condition = roadConditionMatch.Groups[1].Value.Trim();
                }

                return new { 路寬 = $"{width}公尺", 路況 = condition };
            };

            // 解析 projectProp["現況路寬"] 和 projectProp["計畫路寬"]
            projectExcel.CurrentRoadWidth = JsonConvert.SerializeObject(parseRoadWidth(projectExcel.CurrentRoadWidth)); // {路寬: "6公尺", 路況: "未開闢"}
            projectExcel.PlannedRoadWidth = JsonConvert.SerializeObject(parseRoadWidth(projectExcel.PlannedRoadWidth)); // points[0].Property 為 json {路寬: "6公尺", 路況: "未開闢"}

            var pointProp = MapperHelper.A2B<RoadProjectExcelFormat, RoadProjectProp>(projectExcel);
            //var config = new MapperConfiguration(cfg => cfg.CreateMap<RoadProjectExcelFormat, RoadProjectProp>());
            //var mapper =config.CreateMapper();
            //var pointProp = mapper.Map<RoadProjectProp>(projectExcel);
            points[0].Property = JsonConvert.SerializeObject(pointProp);
            return points;
        }
        // RoadProject資料映射
        
        // photoPoints: {"01.png":"24.950000, 121.225928","02.png":"24.950170, 121.226626"}
        private async Task<List<Point>> addPhotoPointsAsync(int Id, Guid areaId, Dictionary<string, string> photoPoints)
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
                    Property = $"{Id}/{photoPoint.Key}"
                };
                points.Add(point);
                i += 1;
            }
            return points;
        }

        public async Task<Boolean> savePhotoFileAsync(IFormFile photo)
        {
            try
            {
                var projectId = photo.FileName.Split("_")[0];
                // 儲存路徑（伺服器上的某個目錄）
                var savePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "img", "roadProject", projectId);
                if (!Directory.Exists(savePath))
                {
                    Directory.CreateDirectory(savePath);
                }

                string photoPath = Path.Combine(savePath, photo.FileName);

                using (var stream = new FileStream(photoPath, FileMode.Create))
                {
                    await photo.CopyToAsync(stream);
                }
                _logger.LogInformation(photo.FileName, "Upload Photo success");
                return true;
            }
            catch
            {
                _logger.LogError(photo.FileName, "Upload Photo failed");
                return false;
            }
        }
        public static List<RoadProjectExcelFormat> ParseRoadProjectExcel(ExcelWorksheet worksheet)
        {
            var result = new List<RoadProjectExcelFormat>();
            var rowCount = worksheet.Dimension.Rows;

            // 獲取標題行 (假設第一行為標題)
            var headers = new Dictionary<string, int>();
            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
            {
                headers[worksheet.Cells[1, col].Text.Trim()] = col;
            }

            for (int row = 2; row <= rowCount; row++) // 從第2行開始讀取數據
            {
                var project = new RoadProjectExcelFormat
                {
                    Id = Guid.NewGuid(),
                    ProjectId = ParseInt(worksheet.Cells[row, headers["專案代號"]].Text),
                    Proposer = worksheet.Cells[row, headers["提案人"]].Text,
                    AdministrativeDistrict = worksheet.Cells[row, headers["行政區"]].Text,
                    StartPoint = worksheet.Cells[row, headers["起點"]].Text,
                    EndPoint = worksheet.Cells[row, headers["終點"]].Text,
                    StartEndLocation = worksheet.Cells[row, headers["起訖位置"]].Text,
                    RoadLength = ParseFloat(worksheet.Cells[row, headers["道路長度"]].Text),
                    CurrentRoadWidth = worksheet.Cells[row, headers["現況路寬"]].Text,
                    PlannedRoadWidth = worksheet.Cells[row, headers["計畫路寬"]].Text,
                    PublicLand = ParseInt(worksheet.Cells[row, headers["公有土地"]].Text),
                    PrivateLand = ParseInt(worksheet.Cells[row, headers["私有土地"]].Text),
                    PublicPrivateLand = ParseInt(worksheet.Cells[row, headers["公私土地"]].Text),
                    ConstructionBudget = ParseCurrency(worksheet.Cells[row, headers["工程經費"]].Text),
                    LandAcquisitionBudget = ParseCurrency(worksheet.Cells[row, headers["用地經費"]].Text),
                    CompensationBudget = ParseCurrency(worksheet.Cells[row, headers["補償經費"]].Text),
                    TotalBudget = ParseCurrency(worksheet.Cells[row, headers["合計經費"]].Text),
                    PlannedExpansionRange = worksheet.Cells[row, headers["預拓範圍"]].Text,
                    StreetViewPhotos = worksheet.Cells[row, headers["街景照片"]].Text,
                    Remarks = worksheet.Cells[row, headers["備註"]].Text,
                    PlannedExpansionId = Guid.NewGuid(),
                    StreetViewId = Guid.NewGuid()
                };

                result.Add(project);
            }

            return result;
        }

        // 解析整數
        private static int ParseInt(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return 0;
            return int.TryParse(value, out var result) ? result : 0;
        }

        // 解析浮點數
        private static float ParseFloat(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return 0;
            value = value.Replace("公尺", "").Trim();
            return float.TryParse(value, out var result) ? result : 0;
        }

        // 解析金額（處理"萬元"單位）
        private static int ParseCurrency(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return 0;
            value = value.Replace("萬", "").Trim();
            return int.TryParse(value, out var result) ? result * 10000 : 0; // 萬元轉元
        }

        public async Task<List<RoadProject>> GetProjectByAsync(GetRoadProjectInput data)
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
            var roadProjects = await query.OrderBy(rp => rp.ProjectId).ToListAsync();
            return roadProjects;
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
            Console.WriteLine("AddRoadProjectAsync");
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
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
                    Remarks = roadProjectInput.Remark == null ? "無" : roadProjectInput.Remark
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
                var expansionPoints = await addExpansion(expansionId, roadProjectInput.ExpansionRange, projectProp);
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
                var expansionA = await _mapDBContext.SaveChangesAsync();
                _mapDBContext.AddRange(expansionPoints);
                var expansionP = await _mapDBContext.SaveChangesAsync();

                _mapDBContext.Areas.Add(photoArea);
                var photoA = await _mapDBContext.SaveChangesAsync();
                _mapDBContext.AddRange(photoPoints);
                var photoP = await _mapDBContext.SaveChangesAsync();

                roadProject.PlannedExpansionId = expansionId;
                roadProject.StreetViewId = photoId;
                await _mapDBContext.RoadProjects.AddAsync(roadProject);
                var rowsAffected = await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return rowsAffected;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "An error occurred while adding road projects by CSV.");
                throw;
            }
        }

        private async Task<List<Point>> addExpansion(Guid areaId, List<range> rangeList, string projectProp)
        {
            Console.WriteLine("addExpansion");
            try
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
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }

        private List<Point> addPhoto(Guid areaId, List<photo> photoList)
        {
            Console.WriteLine("addPhoto");
            try
            {
                var points = new List<Point>();
                for (var i = 0; i < photoList.Count; i++)
                {
                    var photoName = photoList[i].PhotoName;
                    savePhoto(photoList[i].Photo, photoName);
                    var newPoint = new Point
                    {
                        Id = Guid.NewGuid(),
                        Index = i,
                        Latitude = photoList[i].Latitude,
                        Longitude = photoList[i].Longitude,
                        AreaId = areaId,
                        Property = photoList[i].PhotoName
                    };
                    points.Add(newPoint);
                };
                return points;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
            
        }

        private void savePhoto(string photo, string photoName)
        {
            Console.WriteLine("savePhoto");
            try
            {
                // 提取 Base64 字串（移除開頭的 data:image/png;base64, 部分）
                var base64Data = Regex.Replace(photo, @"^data:image/\w+;base64,", string.Empty);

                // 將 Base64 字串轉換為 byte[]
                var imageBytes = Convert.FromBase64String(base64Data);

                // 儲存路徑（伺服器上的某個目錄）
                var savePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "img", "roadProject");
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
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
        }
    
        public async Task<Boolean> UpdateProjectDataAsync(UpdateProjectInput projectInput)
        {
            // 根據Id = projectInput.projectId先更新roadProject
            var roadProject = await _mapDBContext.RoadProjects.FirstOrDefaultAsync(rp => rp.Id == projectInput.Id);
            if (roadProject == null)
            {
                return false;
            }
            var config = new MapperConfiguration(cfg =>
            {
                cfg.CreateMap<UpdateProjectInput, RoadProject>();
            });

            var mapper = config.CreateMapper();
            mapper.Map(projectInput, roadProject);

            //roadProject.Proposer = projectInput.Proposer;
            //roadProject.AdministrativeDistrict = projectInput.AdministrativeDistrict;
            //roadProject.StartPoint = projectInput.StartPoint;
            //roadProject.EndPoint = projectInput.EndPoint;
            //roadProject.StartEndLocation = projectInput.StartEndLocation;
            //roadProject.RoadLength = projectInput.RoadLength;
            //roadProject.CurrentRoadWidth = projectInput.CurrentRoadWidth;
            //roadProject.PlannedRoadWidth = projectInput.PlannedRoadWidth;
            //roadProject.PublicLand = projectInput.PublicLand;
            //roadProject.PrivateLand = projectInput.PrivateLand;
            //roadProject.PublicPrivateLand = projectInput.PublicPrivateLand;
            //roadProject.ConstructionBudget = projectInput.ConstructionBudget;
            //roadProject.LandAcquisitionBudget = projectInput.LandAcquisitionBudget;
            //roadProject.CompensationBudget = projectInput.CompensationBudget;
            //roadProject.TotalBudget = projectInput.TotalBudget;
            //roadProject.Remarks = projectInput.Remarks == null ? "無" : projectInput.Remarks;
            await _mapDBContext.SaveChangesAsync();
            return true;
        }
    }
}
