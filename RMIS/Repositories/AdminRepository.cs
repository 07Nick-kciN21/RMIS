using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.SqlServer;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Globalization;
using System.Text.RegularExpressions;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.API;
using RMIS.Models.sql;
using RMIS.Models.Account.Users;
using RMIS.Utils;
using AutoMapper;
using CsvHelper;
using OfficeOpenXml;
using System.Linq;
using System.Data;
using System.Runtime.ConstrainedExecution;
using RMIS.Models.Auth;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RMIS.Models;
using SharpCompress.Archives;
using SharpCompress.Common;

namespace RMIS.Repositories
{
    public class AdminRepository : AdminInterface
    {
        private readonly MapDBContext _mapDBContext;
        private readonly AuthDbContext _authDbContext;
        private readonly ILogger<AdminRepository> _logger;
        private readonly MapdataInterface _mapdataInterface;
        private readonly FilePathSettings _filePaths;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IWebHostEnvironment _env;
        public AdminRepository(MapDBContext mapDBContext,
                               ILogger<AdminRepository> loger,
                               AuthDbContext authDbContext,
                               MapdataInterface mapdataInterface,
                               IOptions<FilePathSettings> filePaths,
                               IHttpClientFactory httpClientFactory,
                               IWebHostEnvironment env)
        {
            _mapDBContext = mapDBContext;
            _logger = loger;
            _authDbContext = authDbContext;
            _mapdataInterface = mapdataInterface;
            _filePaths = filePaths.Value;
            _httpClientFactory = httpClientFactory;
            _env = env;
        }

        private string ResolvePath(string path) =>
            Path.GetFullPath(path, _env.ContentRootPath);

        public async Task<AddPipelineInput> getPipelineInput(UserAuthInfo userAuthInfo)
        {
            // 取得所有圖資根結點
            var allCategories = _mapDBContext.Categories.Where(c => c.DepartmentIds.Contains(userAuthInfo.departmentId)).ToList();
            // 篩選具有讀取權限的根節點，或者部門為超級管理員，或身分管理者，則全部讀取
            var _Categories = BuildCategorySelectList(allCategories, null, 0);
            var _GeometryTypes = await _mapDBContext.GeometryTypes.OrderBy(gt => gt.OrderId).ToListAsync();

            // 建立 SelectListGroup 字典
            var groupDictionary = new Dictionary<string, SelectListGroup>{
                { "point", new SelectListGroup { Name = "點" } },
                { "line", new SelectListGroup { Name = "線" } },
                { "plane", new SelectListGroup { Name = "面" } },
                { "arrowline", new SelectListGroup { Name = "箭頭" } }
            };

            List<Department> _Departments;

            if (userAuthInfo.departmentId == 2)
            {
                _Departments = await _authDbContext.Departments.ToListAsync();
            }
            else
            {
                _Departments = await _authDbContext.Departments
                    .Where(d => d.Id == userAuthInfo.departmentId)
                    .ToListAsync();
            }

            var input = new AddPipelineInput
            {
                Categories = _Categories,
                GeometryTypes = _GeometryTypes.Select(g =>
                {
                    return new SelectListItem
                    {
                        Text = g.Name,                 // 顯示項目名稱
                        Value = g.Id.ToString(),                // 保留英文作為 Value
                        Group = groupDictionary[g.Kind] // 群組名稱是中文
                    };
                }).ToList(),
                Departments = _Departments.Select(d =>
                {
                    return new SelectListItem
                    {
                        Text = d.Name,
                        Value = d.Id.ToString()
                    };
                }).ToList()
            };
            // KindGroup依照點線面
            return input;
        }

        private IEnumerable<SelectListItem> BuildCategorySelectList(List<Category> allCategories, Guid? ParentId, int deptId, int level = 0)
        {
            // 初始化一個列表來存放結果
            var result = new List<SelectListItem>();
            var currentCategories = allCategories.Where(c => c.ParentId == ParentId).ToList();
            foreach (var category in currentCategories)
            {
                // 創造節點
                result.Add(new SelectListItem
                {
                    Text = new string('*', level * 2) + " " + category.Name, // 加上縮排
                    Value = category.Id.ToString()
                });
                // 獲取該分類下的所有子分類
                           
                var subCategories = BuildCategorySelectList(allCategories, category.Id, deptId, level + 1);
                result.AddRange(subCategories);
            }
            return result;
        }

        public async Task<int> AddPipelineAsync(AddPipelineInput pipelineInput)
        {
            var pipelineId = Guid.NewGuid();
            searchParentCategory(Guid.Parse(pipelineInput.CategoryId), pipelineInput.selectedDepartmentIds);
            var pipeItem = new Pipeline
            {
                Id = pipelineId,
                Name = pipelineInput.Name,
                ManagementUnit = pipelineInput.ManagementUnit,
                CategoryId = Guid.Parse(pipelineInput.CategoryId),
                DepartmentIds = pipelineInput.selectedDepartmentIds,
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
        private void searchParentCategory(Guid? id, List<int> deptIds)
        {
            if (id == null) return;

            var parentCat = _mapDBContext.Categories.FirstOrDefault(c => c.Id == id);
            if (parentCat == null) return;

            bool isUpdated = false;

            foreach (int deptId in deptIds)
            {
                if (!parentCat.DepartmentIds.Contains(deptId))
                {
                    parentCat.DepartmentIds.Add(deptId);
                    isUpdated = true;
                }
            }

            if (isUpdated)
            {
                _mapDBContext.SaveChanges();
            }

            if (parentCat.ParentId != null)
            {
                searchParentCategory(parentCat.ParentId, deptIds);
            }
        }
        public async Task<AddRoadInput> getRoadInput(UserAuthInfo userAuthInfo)
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
                    //Text = buildPipelinePath(p.CategoryId) + "/" + p.Name,
                    Text = p.Name,
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
        public async Task<AddRoadByCSVInput> getRoadByCSVInput(UserAuthInfo userAuthInfo)
        {
            // 找到所有符合的pipeline
            var allPipelines = await _mapDBContext.Pipelines
                .Where(c => c.DepartmentIds
                    .Contains(userAuthInfo.departmentId) && 
                       c.IsGeneralPipeline)
                .ToListAsync();
            var allCategory = await _mapDBContext.Categories
                .Where(c => c.DepartmentIds
                    .Contains(userAuthInfo.departmentId))
                .ToListAsync();

            if (allPipelines == null)
            {
                return new AddRoadByCSVInput { Pipelines = new List<SelectListItem>() };
            }

            // 建立 SelectListItem
            var pipelineSelectList = new List<SelectListItem>();
            buildPipelinePath(pipelineSelectList, allCategory, allPipelines, null, "");
            // 建立 SelectListItem
            var model = new AddRoadByCSVInput
            {
                Pipelines = pipelineSelectList
            };

            return model;
        }
        private void buildPipelinePath(List<SelectListItem> pipelineSelectList, List<Category> allCategory, List<Pipeline> allPipeline, Guid? parentId, string path)
        {
            var currentCategories = allCategory.Where(ac => ac.ParentId == parentId).OrderBy(ac => ac.OrderId).ToList();
            foreach (var category in currentCategories)
            {
                var pipelines = allPipeline.Where(ap => ap.CategoryId == category.Id).ToList();
                var next_path = path + "/" + category.Name;
                foreach (var pipeline in pipelines)
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

            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
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
            }); // end strategy
        }
        public async Task<AddCategoryInput> getCategoryInput(UserAuthInfo userAuthInfo)
        {
            // 取得所有圖資根結點
            var allCategories = _mapDBContext.Categories.Where(c => c.DepartmentIds.Contains(userAuthInfo.departmentId)).ToList();
            var _Categories = BuildCategorySelectList(allCategories, null, userAuthInfo.departmentId, 0);
            var CategoryInput = new AddCategoryInput
            {
                parentCategories = _Categories
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
            await _mapDBContext.MapSources.AddAsync(mapsource);
            int rowsAffected = await _mapDBContext.SaveChangesAsync();
            return rowsAffected;
        }

        public async Task<(int categoryCount, int pipelineCount)> AddCategoryByJsonAsync(JObject jObject)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
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
            }); // end strategy
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
                    var mergedDepartments = new HashSet<int>();

                    foreach (var item in jArray)
                    {
                        var departmentIds = item["可用部門"]?.ToObject<List<int>>() ?? new List<int>();
                        foreach (var id in departmentIds)
                        {
                            mergedDepartments.Add(id);
                        }
                        // 新增Pipeline
                        var pipelineId = Guid.NewGuid();
                        var newPipeline = new Pipeline
                        {
                            Id = pipelineId,
                            Name = item["名稱"].ToString(),
                            ManagementUnit = item["管理單位"].ToString(),
                            DepartmentIds = departmentIds,
                            IsGeneralPipeline = true,
                            CategoryId = parentId,
                            dataInfo = item["詮釋資料"]?.ToString()
                        };
                        pipelines.Add(newPipeline);

                        _logger.LogInformation("Added Pipeline: {Name}, ParentId: {ParentId}", newPipeline.Name, parentId);
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
                    // 將彙整的部門設回上層 Category
                    var targetCategory = categories.FirstOrDefault(c => c.Id == parentId);
                    if (targetCategory != null)
                    {
                        targetCategory.DepartmentIds = mergedDepartments.ToList();
                        _logger.LogInformation("Set DepartmentIds for Category {Name}: [{Ids}]", targetCategory.Name, string.Join(", ", mergedDepartments));
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
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
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
            }); // end strategy
        }
        public async Task<int> DeleteCategoryAsync(Guid? categoryId)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
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
            }); // end strategy
        }
        public async Task<int> DeleteLayerDataAsync(Guid? layerId)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
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
            }); // end strategy
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

        public async Task<FlagPanelInput> GetFlaggedPipelinesAsync(UserAuthInfo userAuthInfo)
        {
            var flaggedPipelines = await _mapDBContext.Pipelines
                .Where(p => p.Name.Contains("權管土地"))
                .Select(p => new pipelineItem 
                { 
                    Id = p.Id,
                    Name = p.Name
                })
                .ToListAsync();
            var result = new FlagPanelInput
            {
                FlaggedPipelines = flaggedPipelines,
            };
            return result;
        }

        public async Task<FocusedData> GetFocusDataAsync(GetFocusDataInput input)
        {
            // 0: 臨時道路借用申請(路線)、臨時道路借用申請(借用範團)
            // 1: 臨時道路借用申請(路線)
            // 2: 臨時道路借用申請(借用範圍)
            var RoadName = input.RoadName == null ? "" : input.RoadName;
            var focusedPipelines = new List<string>();
            if (input.FocusType == 0)
            {
                focusedPipelines = await _mapDBContext.Pipelines
                    .Where(p => p.Name.Contains("臨時道路借用申請(路線)") || p.Name.Contains("臨時道路借用申請(借用範團)"))
                    .Select(p => p.Id.ToString())
                    .ToListAsync();
                var focusedRoadPoints = await GetFocusRoadPointByDatetime(Guid.Parse(focusedPipelines[0]), RoadName, input.FocusStartDate, input.FocusEndDate, "臨時道路借用申請(路線)");
                var focusedRangePoints = await GetFocusRoadPointByDatetime(Guid.Parse(focusedPipelines[1]), RoadName, input.FocusStartDate, input.FocusEndDate, "臨時道路借用申請(範圍)");
                var result = new FocusedData
                {
                    FocusedRoad = focusedRoadPoints,
                    FocusedRange = focusedRangePoints
                };
                return result;
            }
            else if (input.FocusType == 1)
            {
                focusedPipelines = await _mapDBContext.Pipelines
                    .Where(p => p.Name.Contains("臨時道路借用申請(借用範團)"))
                    .Select(p => p.Id.ToString())
                    .ToListAsync();
                var focusedRangePoints = await GetFocusRoadPointByDatetime(Guid.Parse(focusedPipelines[0]), RoadName, input.FocusStartDate, input.FocusEndDate, "臨時道路借用申請(範圍)");
                var result = new FocusedData
                {
                    FocusedRoad = null,
                    FocusedRange = focusedRangePoints
                };
                return result;
            }
            else if (input.FocusType == 2)
            {
                focusedPipelines = await _mapDBContext.Pipelines
                    .Where(p => p.Name.Contains("臨時道路借用申請(路線)"))
                    .Select(p => p.Id.ToString())
                    .ToListAsync();
                var focusedRoadPoints = await GetFocusRoadPointByDatetime(Guid.Parse(focusedPipelines[0]), RoadName, input.FocusStartDate, input.FocusEndDate, "臨時道路借用申請(路線)");
                var result = new FocusedData
                {
                    FocusedRoad = focusedRoadPoints,
                    FocusedRange = null,
                    Construct = null
                };
                return result;
            }
            else if (input.FocusType == 3)
            {
                var noticeQuery = await _mapDBContext.ConstructNotices.Where(cn => 
                    ((cn.ConstructionStartDate >=input.FocusStartDate && cn.ConstructionStartDate <= input.FocusEndDate) ||
                    (cn.ConstructionEndDate >= input.FocusStartDate && cn.ConstructionEndDate <= input.FocusEndDate)) &&
                    cn.ConstructionLocation.Contains(RoadName)
                    ).ToListAsync();

                var constructPoints = await GetNoticePointByDatetime(noticeQuery, input.FocusStartDate, input.FocusEndDate, "施工通報(道路挖掘)");
                var result = new FocusedData
                {
                    FocusedRoad = null,
                    FocusedRange = null,
                    Construct = constructPoints
                };
                return result;
            }
            // 根據focusedPipelines的Id查找對應的資料
            return null;
        }

        private async Task<List<focusedCase>> GetFocusRoadPointByDatetime(Guid FocusRoadPipelineId, string RoadName, DateTime FocusStartDate, DateTime FocusEndDate, string caseType)
        {
            try
            {
                // 先取出各點的prop過濾出符合日期的點
                // FocusStartDate 為 
                var query = await _mapDBContext.Points.Where(p => p.Area.Layer.PipelineId == FocusRoadPipelineId && p.Index == 0).ToListAsync();
                query = query.Where(q =>
                {
                    var prop = JObject.Parse(q.Property);
                    var startDate = prop["租借起始日"].Value<DateTime>();
                    var endDate = prop["租借結束日"].Value<DateTime>();
                    var roadName = prop["借用路段"].Value<string>();
                    return (startDate >= FocusStartDate && startDate <= FocusEndDate || endDate >= FocusStartDate && endDate <= FocusEndDate) &&
                        roadName.Contains(RoadName);
                }).ToList();

                var result = new List<focusedCase>();
                for (int i = 0; i < query.Count; i++)
                {
                    var prop = query[i].Property;
                    var propDict = JsonConvert.DeserializeObject<Dictionary<string, string>>(prop);
                    var startDate = ParseDate(propDict["租借起始日"]);
                    var endDate = ParseDate(propDict["租借結束日"]);
                    var focusedRoad = new focusedCase
                    {
                        licenseNumber = propDict.ContainsKey("許可證號") ? propDict["許可證號"] : "",
                        date = $"{startDate}至{endDate}",
                        location = propDict["借用路段"],
                        reason = propDict["申請租借事由"],
                        caseType = caseType,
                        points = new List<Point>()
                    };

                    var focusedRoadPoints = await _mapDBContext.Points
                        .Where(p => p.AreaId == query[i].AreaId)
                        .OrderBy(p => p.Index)
                        .ToListAsync();

                    focusedRoad.points.AddRange(focusedRoadPoints);
                    result.Add(focusedRoad);
                }
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while getting focus data by datetime.");
                throw;
            }
        }
        private async Task<List<noticeCase>> GetNoticePointByDatetime(List<ConstructNotice> noticeQuery, DateTime FocusStartDate, DateTime FocusEndDate, string caseType)
        {
            var noticePositionList = noticeQuery.Select(n => n.PositionId).ToList();
            var query = await _mapDBContext.Points.Where(p => noticePositionList.Contains(p.AreaId)).ToListAsync();
            //query = query.Where(q =>
            //{
            //    var prop = JObject.Parse(q.Property);
            //    var startDate = prop["施工開始日期"].Value<DateTime>();
            //    var endDate = prop["施工結束日期"].Value<DateTime>();
            //    return startDate >= FocusStartDate && startDate <= FocusEndDate || endDate >= FocusStartDate && endDate <= FocusEndDate;
            //}).ToList();

            var result = new List<noticeCase>();
            for (int i = 0; i < query.Count; i++)
            {
                var prop = query[i].Property;
                var propDict = JsonConvert.DeserializeObject<Dictionary<string, string>>(prop);
                var startDate = ParseDate(propDict["施工開始日期"]);
                var endDate = ParseDate(propDict["施工結束日期"]);
                var focusedRoad = new noticeCase
                {
                    licenseNumber = propDict["許可證號"],
                    date = $"{startDate}至{endDate}",
                    location = propDict["施工地點"],
                    reason = propDict["施工原因"],
                    caseType = caseType,
                    points = new List<Point>()
                };

                var focusedRoadPoints = await _mapDBContext.Points
                    .Where(p => p.AreaId == query[i].AreaId)
                    .OrderBy(p => p.Index)
                    .ToListAsync();

                focusedRoad.points.AddRange(focusedRoadPoints);
                result.Add(focusedRoad);
            }
            return result;
        }
        // 方法: 解析日期並轉換為 yyyy/M/d TT hh:mm:ss 格式
        private string ParseDate(string dateStr)
        {
            if (DateTime.TryParse(dateStr, out DateTime parsedDate))
            {
                return parsedDate.ToString("yyyy/M/d tt hh:mm:ss");
            }
            return dateStr; // 如果解析失敗，返回原始字串
        }

        // photo: 圖檔 photoName:照片名稱 roadProjectDic:專案代號(照片目錄)
        private async Task savePhotoAsync(IFormFile photo, string photoName, string roadProjectDic)
        {
            Console.WriteLine($"savePhoto {photoName} to {roadProjectDic}");
            try
            {
                var savePath = Path.Combine(ResolvePath(_filePaths.RoadProjectPhoto), roadProjectDic);
                if (!Directory.Exists(savePath))
                {
                    Directory.CreateDirectory(savePath);
                }
                var filePath = Path.Combine(savePath, photoName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await photo.CopyToAsync(stream);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
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
            var propMap = new Dictionary<string, string>
            {
                { "Proposer", "提案人" },
                { "AdministrativeDistrict", "行政區" },
                { "StartEndLocation", "起訖位置" },
                { "RoadLength", "道路長度" },
                { "CurrentRoadWidth", "現況路寬" },
                { "PlannedRoadWidth", "計畫路寬" },
                { "PublicLand", "公有土地" },
                { "PrivateLand", "私有土地" },
                { "PublicPrivateLand", "公私土地" },
                { "ConstructionBudget", "工程經費" },
                { "LandAcquisitionBudget", "用地經費" },
                { "CompensationBudget", "補償經費" },
                { "TotalBudget", "合計經費" },
                { "Remarks", "備註" }
            };
            var propDict = pointProp.GetType().GetProperties()
            .ToDictionary(
                prop => propMap.ContainsKey(prop.Name) ? propMap[prop.Name] : prop.Name, // 使用中文名稱
                prop => prop.GetValue(pointProp)?.ToString() // 獲取屬性值
            );

            points[0].Property = JsonConvert.SerializeObject(propDict);
            return points;
        }
        
        // photoPoints: {"01.png":"24.950000, 121.225928","02.png":"24.950170, 121.226626"}
        private async Task<List<Point>> addPhotoPointsAsync(string ProjectId, Guid areaId, Dictionary<string, string> photoPoints)
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
                    Property = $"{{\"url\":\"{ProjectId}/{photoPoint.Key}\"}}"
                };
                points.Add(point);
                i += 1;
            }
            return points;
        }

        private async Task<List<RoadProjectExcelFormat>> ParseRoadProjectExcelAsync(ExcelWorksheet worksheet)
        {
            var result = new List<RoadProjectExcelFormat>();
            var rowCount = worksheet.Dimension.Rows;

            // 獲取標題行 (假設第一行為標題)
            var headers = new Dictionary<string, int>();
            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
            {
                headers[worksheet.Cells[1, col].Text.Trim()] = col;
            }
            var maxIndex = await _mapDBContext.RoadProjects.MaxAsync(rp => (int?)rp.Index) ?? 0;
            for (int row = 2; row <= rowCount; row++) // 從第2行開始讀取數據
            {
                Console.WriteLine(worksheet.Cells[row, headers["road_id"]].Text);
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
                var roadLength = data.RoadLength.Value.ToString();
                query = query.Where(rp => rp.RoadLength == roadLength);
            }

            // 階段
            if (!string.IsNullOrEmpty(data.Step))
            {
                query = query.Where(rp => rp.step == data.Step);
            }

            // 工程經費
            if (data.Budgets?.ConstructionBudget?.Value != null)
            {
                var projectBudget = data.Budgets.ConstructionBudget.Value * 10000;
                switch (data.Budgets.ConstructionBudget.Option)
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
            if (data.Budgets?.LandAcquisitionBudget?.Value != null)
            {
                var landBudget = data.Budgets.LandAcquisitionBudget.Value * 10000;
                switch (data.Budgets.LandAcquisitionBudget.Option)
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
            var roadProjects = await query.OrderBy(rp => rp.Index).ToListAsync();
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
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var adminDistId = _mapDBContext.AdminDist.FirstOrDefault(ad => ad.Town == roadProjectInput.AdminDistrict)?.Id;
                var startEndLocation = roadProjectInput.StartPoint + "至" + roadProjectInput.EndPoint;

                // 產生 ProjectId (使用時間戳確保唯一性)
                var now = DateTime.Now;
                var projectId = $"RP{now:yyyyMMddHHmmss}";

                // 新增RoadProject (Index 由資料庫自動產生)
                var roadProject = new RoadProject
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    step = roadProjectInput.Step ?? "1",
                    Proposer = roadProjectInput.Proposer,
                    AdministrativeDistrict = roadProjectInput.AdminDistrict,
                    StartPoint = roadProjectInput.StartPoint,
                    EndPoint = roadProjectInput.EndPoint,
                    StartEndLocation = startEndLocation,
                    RoadLength = roadProjectInput.RoadLength.ToString(),
                    CurrentRoadWidth = parseRoadWidthSimple(roadProjectInput.CurrentRoadWidth, roadProjectInput.CurrentRoadType),
                    PlannedRoadWidth = parseRoadWidthSimple(roadProjectInput.PlannedRoadWidth, roadProjectInput.PlannedRoadType),
                    PublicLand = roadProjectInput.PublicLand.ToString(),
                    PrivateLand = roadProjectInput.PrivateLand.ToString(),
                    PublicPrivateLand = roadProjectInput.PublicPrivateLand.ToString(),
                    ConstructionBudget = roadProjectInput.ConstructionBudget * 10000,
                    LandAcquisitionBudget = roadProjectInput.LandBudget * 10000,
                    CompensationBudget = roadProjectInput.CompensationBudget * 10000,
                    TotalBudget = roadProjectInput.TotalBudget * 10000,
                    Remarks = roadProjectInput.Remark == null ? "無" : roadProjectInput.Remark,
                    ReviewYear = roadProjectInput.ReviewYear ?? "",
                    CaseType = roadProjectInput.CaseType ?? "",
                    ProjectName = roadProjectInput.ProjectName ?? "",
                    RCCount = roadProjectInput.RCCount ?? "",
                    TinHouseCount = roadProjectInput.TinHouseCount ?? "",
                    ReviewResult = roadProjectInput.ReviewResult ?? "",
                    CreateTime = now
                };

                var expansionId = Guid.NewGuid();
                // roadProject 轉換成json (使用中文鍵名以配合前端顯示，所有值為字串)
                var projectPropObj = new Dictionary<string, string>
                {
                    { "提案人", roadProjectInput.Proposer ?? "" },
                    { "行政區", roadProjectInput.AdminDistrict ?? "" },
                    { "階段", roadProject.step ?? "" },
                    { "起訖位置", startEndLocation ?? "" },
                    { "道路長度", roadProjectInput.RoadLength.ToString() },
                    { "現況路寬", roadProject.CurrentRoadWidth ?? "" },
                    { "計畫路寬", roadProject.PlannedRoadWidth ?? "" },
                    { "公有土地", roadProjectInput.PublicLand.ToString() },
                    { "私有土地", roadProjectInput.PrivateLand.ToString() },
                    { "公私土地", roadProjectInput.PublicPrivateLand.ToString() },
                    { "工程經費", roadProject.ConstructionBudget.ToString() },
                    { "用地經費", roadProject.LandAcquisitionBudget.ToString() },
                    { "補償經費", roadProject.CompensationBudget.ToString() },
                    { "合計經費", roadProject.TotalBudget.ToString() },
                    { "審議年度", roadProject.ReviewYear ?? "" },
                    { "案件類型", roadProject.CaseType ?? "" },
                    { "工程名稱", roadProject.ProjectName ?? "" },
                    { "RC數量", roadProject.RCCount ?? "" },
                    { "鐵皮屋數量", roadProject.TinHouseCount ?? "" },
                    { "審議結果", roadProject.ReviewResult ?? "" },
                    { "備註", roadProjectInput.Remark ?? "" }
                };
                var projectProp = JsonConvert.SerializeObject(projectPropObj);
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
                var rangeList = roadProjectInput.ExpansionRange ?? new List<range>();
                var expansionPoints = await addExpansion(expansionId, rangeList, projectProp);
                var photoId = Guid.NewGuid();
                var photoArea = new Area
                {
                    Id = photoId,
                    Name = $"{startEndLocation} - 街景照片",
                    ConstructionUnit = "工務局",
                    AdminDistId = adminDistId ?? Guid.Empty,
                    LayerId = Guid.Parse("C155F3E2-42B6-4004-97C2-05E1C0EFC0E0") // 街景照片圖層
                };

                var photoList = roadProjectInput.StreetViewPhoto ?? new List<photo>();
                var photoPoints = await addPhoto(photoId, photoList, projectId);

                await _mapDBContext.Areas.AddAsync(expansionArea);
                await _mapDBContext.Areas.AddAsync(photoArea);
                await _mapDBContext.SaveChangesAsync();

                if (expansionPoints != null && expansionPoints.Count > 0)
                {
                    await _mapDBContext.AddRangeAsync(expansionPoints);
                }
                if (photoPoints != null && photoPoints.Count > 0)
                {
                    await _mapDBContext.AddRangeAsync(photoPoints);
                }
                await _mapDBContext.SaveChangesAsync();

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
                _logger.LogError(ex, "新增專案資料失敗.");
                throw;
            }
            }); // end strategy
        }

        public async Task<bool> DeleteRoadProjectAsync(Guid projectId)
        {
            Console.WriteLine($"DeleteRoadProjectAsync: {projectId}");
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                // 查詢專案
                var project = await _mapDBContext.RoadProjects
                    .FirstOrDefaultAsync(rp => rp.Id == projectId);

                if (project == null)
                {
                    return false;
                }

                // 刪除相關的 Points (拓寬範圍)
                var expansionPoints = await _mapDBContext.Points
                    .Where(p => p.AreaId == project.PlannedExpansionId)
                    .ToListAsync();
                if (expansionPoints.Any())
                {
                    _mapDBContext.Points.RemoveRange(expansionPoints);
                }

                // 刪除相關的 Points (街景照片)
                var photoPoints = await _mapDBContext.Points
                    .Where(p => p.AreaId == project.StreetViewId)
                    .ToListAsync();
                if (photoPoints.Any())
                {
                    _mapDBContext.Points.RemoveRange(photoPoints);
                }

                // 刪除相關的 Areas
                var expansionArea = await _mapDBContext.Areas
                    .FirstOrDefaultAsync(a => a.Id == project.PlannedExpansionId);
                if (expansionArea != null)
                {
                    _mapDBContext.Areas.Remove(expansionArea);
                }

                var photoArea = await _mapDBContext.Areas
                    .FirstOrDefaultAsync(a => a.Id == project.StreetViewId);
                if (photoArea != null)
                {
                    _mapDBContext.Areas.Remove(photoArea);
                }

                // 刪除歷程資料及相關文件
                var strProjectId = project.ProjectId;

                var process1List = await _mapDBContext.RoadProjectProcess1
                    .Where(p => p.ProjectId == strProjectId).ToListAsync();
                var process2List = await _mapDBContext.RoadProjectProcess2
                    .Where(p => p.ProjectId == strProjectId).ToListAsync();
                var process3List = await _mapDBContext.RoadProjectProcess3
                    .Where(p => p.ProjectId == strProjectId).ToListAsync();

                var allProcessIds = process1List.Select(p => p.ProcessId)
                    .Concat(process2List.Select(p => p.ProcessId))
                    .Concat(process3List.Select(p => p.ProcessId))
                    .ToList();

                if (allProcessIds.Count > 0)
                {
                    // 刪除 ProcessFile 記錄
                    var processFiles = await _mapDBContext.RoadProjectProcessFiles
                        .Where(f => allProcessIds.Contains(f.ProcessId))
                        .ToListAsync();
                    if (processFiles.Any())
                        _mapDBContext.RoadProjectProcessFiles.RemoveRange(processFiles);

                    // 刪除磁碟上的文件目錄 ({ProcessFile}/{ProjectId}/)
                    var projectFolder = Path.Combine(ResolvePath(_filePaths.ProcessFile), strProjectId);
                    if (Directory.Exists(projectFolder))
                        Directory.Delete(projectFolder, recursive: true);

                    _mapDBContext.RoadProjectProcess1.RemoveRange(process1List);
                    _mapDBContext.RoadProjectProcess2.RemoveRange(process2List);
                    _mapDBContext.RoadProjectProcess3.RemoveRange(process3List);
                }

                // 刪除專案
                _mapDBContext.RoadProjects.Remove(project);

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation($"已刪除專案: {projectId}");
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, $"刪除專案失敗: {projectId}");
                throw;
            }
            }); // end strategy
        }

        /// <summary>
        /// 從 Excel 匯入道路專案（含 ZIP 照片壓縮檔）
        /// </summary>
        public async Task<ImportRoadProjectResult> ImportRoadProjectByExcelAsync(ImportRoadProjectByExcelInput input)
        {
            var result = new ImportRoadProjectResult();
            var errors = new List<string>();

            if ((input.ExcelFile == null || input.ExcelFile.Length == 0) &&
                (input.ProcessExcelFile == null || input.ProcessExcelFile.Length == 0))
            {
                result.Success = false;
                result.Message = "請至少上傳道路專案 Excel 或歷程 Excel";
                return result;
            }

            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                int importedCount = 0;

                // ── 道路專案 Excel ──
                if (input.ExcelFile != null && input.ExcelFile.Length > 0)
                {
                    // 1. 解析 Excel
                    var rows = new List<ExcelRoadProjectRow>();
                    using (var stream = new MemoryStream())
                    {
                        await input.ExcelFile.CopyToAsync(stream);
                        using (var package = new ExcelPackage(stream))
                        {
                            var worksheet = package.Workbook.Worksheets[0];
                            rows = ParseRoadProjectExcel(worksheet, errors);
                        }
                    }

                    if (rows.Count == 0)
                    {
                        result.Success = false;
                        result.Message = "道路專案 Excel 中無有效資料";
                        result.Errors = errors;
                        return result;
                    }

                    // 1.5 為沒有拓寬範圍座標的資料，透過路名自動查詢座標
                    await GeocodeImportRowsAsync(rows);

                    // 2. 檢查重複的 ProjectId
                    var projectIds = rows.Select(r => r.ProjectId).Where(id => !string.IsNullOrEmpty(id)).ToList();
                    var existingIds = await _mapDBContext.RoadProjects
                        .Where(rp => projectIds.Contains(rp.ProjectId))
                        .Select(rp => rp.ProjectId)
                        .ToListAsync();

                    if (existingIds.Count > 0)
                    {
                        result.Success = false;
                        result.Message = $"以下專案代號已存在: {string.Join(", ", existingIds)}";
                        return result;
                    }

                    // 3. 解壓縮照片 ZIP（如果有）
                    var photoDict = new Dictionary<string, List<string>>();
                    if (input.PhotoZipFile != null && input.PhotoZipFile.Length > 0)
                    {
                        photoDict = await ExtractPhotoZipAsync(input.PhotoZipFile);
                    }

                    // 3.1 驗證照片
                    var photoErrors = new List<string>();
                    foreach (var row in rows)
                    {
                        var photoCoords = ParsePhotoCoordinatesJson(row.StreetViewPhotoJson);
                        if (photoCoords.Count == 0) continue;

                        if (!photoDict.ContainsKey(row.ProjectId))
                        {
                            photoErrors.Add($"專案 {row.ProjectId}: 壓縮檔中找不到對應的照片目錄「{row.ProjectId}」");
                            continue;
                        }

                        var availablePhotos = photoDict[row.ProjectId];
                        foreach (var photo in photoCoords)
                        {
                            if (!availablePhotos.Contains(photo.photoName))
                                photoErrors.Add($"專案 {row.ProjectId}: 壓縮檔中找不到照片「{photo.photoName}」");
                        }
                    }

                    if (photoErrors.Count > 0)
                    {
                        result.Success = false;
                        result.Message = "照片檔案驗證失敗，匯入已中止";
                        result.Errors = photoErrors;
                        return result;
                    }

                    // 4. 建立專案資料
                    foreach (var row in rows)
                    {
                        try
                        {
                            await CreateRoadProjectFromExcelRow(row, photoDict);
                            importedCount++;
                        }
                        catch (Exception ex)
                        {
                            errors.Add($"專案 {row.ProjectId}: {ex.Message}");
                        }
                    }

                    await _mapDBContext.SaveChangesAsync();
                }

                // ── 歷程 Excel ──
                int processImportedCount = 0;
                if (input.ProcessExcelFile != null && input.ProcessExcelFile.Length > 0)
                {
                    processImportedCount = await ImportProcessByExcelAsync(
                        input.ProcessExcelFile, input.ProcessDocZipFile, errors);
                }

                await transaction.CommitAsync();

                var msgParts = new List<string>();
                if (importedCount > 0) msgParts.Add($"成功匯入 {importedCount} 筆專案");
                if (processImportedCount > 0) msgParts.Add($"成功匯入 {processImportedCount} 筆歷程");

                result.Success = true;
                result.Message = msgParts.Count > 0 ? string.Join("，", msgParts) : "匯入完成";
                result.ImportedCount = importedCount;
                result.ProcessImportedCount = processImportedCount;
                result.Errors = errors;
                return result;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _mapDBContext.ChangeTracker.Clear();
                _logger.LogError(ex, "Excel 匯入道路專案失敗");
                result.Success = false;
                result.Message = $"匯入失敗: {ex.Message}";
                result.Errors = errors;
                return result;
            }
            }); // end strategy
        }

        /// <summary>
        /// 解析 Excel 工作表
        /// </summary>
        private List<ExcelRoadProjectRow> ParseRoadProjectExcel(ExcelWorksheet worksheet, List<string> errors)
        {
            var rows = new List<ExcelRoadProjectRow>();
            var rowCount = worksheet.Dimension?.Rows ?? 0;

            // 第一行為標題，從第二行開始讀取資料
            for (int row = 2; row <= rowCount; row++)
            {
                try
                {
                    var projectId = worksheet.Cells[row, 1].Text?.Trim();
                    if (string.IsNullOrEmpty(projectId)) continue; // 跳過空行

                    var excelRow = new ExcelRoadProjectRow
                    {
                        ProjectId = projectId,
                        Proposer = worksheet.Cells[row, 2].Text?.Trim() ?? "",
                        AdministrativeDistrict = worksheet.Cells[row, 3].Text?.Trim() ?? "",
                        Step = worksheet.Cells[row, 4].Text?.Trim() ?? "1",
                        StartPoint = worksheet.Cells[row, 5].Text?.Trim() ?? "",
                        EndPoint = worksheet.Cells[row, 6].Text?.Trim() ?? "",
                        StartEndLocation = worksheet.Cells[row, 7].Text?.Trim() ?? "",
                        RoadLength = worksheet.Cells[row, 8].Text?.Trim() ?? "",
                        CurrentRoadWidth = worksheet.Cells[row, 9].Text?.Trim() ?? "",
                        PlannedRoadWidth = worksheet.Cells[row, 10].Text?.Trim() ?? "",
                        PublicLand = worksheet.Cells[row, 11].Text?.Trim() ?? "",
                        PrivateLand = worksheet.Cells[row, 12].Text?.Trim() ?? "",
                        PublicPrivateLand = worksheet.Cells[row, 13].Text?.Trim() ?? "",
                        ConstructionBudget = ParseInt(worksheet.Cells[row, 14].Text),
                        LandAcquisitionBudget = ParseInt(worksheet.Cells[row, 15].Text),
                        CompensationBudget = ParseInt(worksheet.Cells[row, 16].Text),
                        TotalBudget = ParseInt(worksheet.Cells[row, 17].Text),
                        Remarks = worksheet.Cells[row, 18].Text?.Trim() ?? "",
                        ReviewYear = worksheet.Cells[row, 19].Text?.Trim() ?? "",
                        CaseType = worksheet.Cells[row, 20].Text?.Trim() ?? "",
                        ProjectName = worksheet.Cells[row, 21].Text?.Trim() ?? "",
                        RCCount = worksheet.Cells[row, 22].Text?.Trim() ?? "",
                        TinHouseCount = worksheet.Cells[row, 23].Text?.Trim() ?? "",
                        ReviewResult = worksheet.Cells[row, 24].Text?.Trim() ?? "",
                        ExpansionRangeJson = worksheet.Cells[row, 25].Text?.Trim() ?? "",
                        StreetViewPhotoJson = worksheet.Cells[row, 26].Text?.Trim() ?? ""
                    };

                    // 自動組合起訖位置
                    if (string.IsNullOrEmpty(excelRow.StartEndLocation) && !string.IsNullOrEmpty(excelRow.StartPoint))
                    {
                        excelRow.StartEndLocation = $"{excelRow.StartPoint}至{excelRow.EndPoint}";
                    }

                    rows.Add(excelRow);
                }
                catch (Exception ex)
                {
                    errors.Add($"第 {row} 行解析失敗: {ex.Message}");
                }
            }

            return rows;
        }

        /// <summary>
        /// 解壓縮照片 ZIP 並儲存到對應目錄
        /// </summary>
        /// <summary>
        /// 解壓縮照片檔案（支援 ZIP、RAR、7z、TAR、GZip 等格式）
        /// </summary>
        private async Task<Dictionary<string, List<string>>> ExtractPhotoZipAsync(IFormFile zipFile)
        {
            var photoDict = new Dictionary<string, List<string>>();
            var basePath = ResolvePath(_filePaths.RoadProjectPhoto);

            // 將上傳檔案複製到 MemoryStream（SharpCompress 需要可定位的 Stream）
            using var memoryStream = new MemoryStream();
            await zipFile.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            // 使用 SharpCompress 自動識別壓縮格式（支援 ZIP、RAR、7z、TAR、GZip 等）
            using var archive = ArchiveFactory.Open(memoryStream);
            foreach (var entry in archive.Entries)
            {
                // 跳過目錄和隱藏檔案
                if (entry.IsDirectory) continue;
                var entryKey = entry.Key;
                if (string.IsNullOrEmpty(entryKey)) continue;

                // 取得檔案名稱
                var fileName = Path.GetFileName(entryKey);
                if (string.IsNullOrEmpty(fileName) || fileName.StartsWith(".")) continue;

                // 取得 projectId (第一層目錄名)
                var parts = entryKey.Replace('\\', '/').Split('/');
                if (parts.Length < 2) continue;

                var projectId = parts[0];

                // 建立目錄
                var targetDir = Path.Combine(basePath, projectId);
                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                }

                // 儲存檔案
                var targetPath = Path.Combine(targetDir, fileName);
                using (var entryStream = entry.OpenEntryStream())
                using (var fileStream = new FileStream(targetPath, FileMode.Create))
                {
                    await entryStream.CopyToAsync(fileStream);
                }

                // 記錄照片
                if (!photoDict.ContainsKey(projectId))
                {
                    photoDict[projectId] = new List<string>();
                }
                photoDict[projectId].Add(fileName);
            }

            return photoDict;
        }

        /// <summary>
        /// 從 Excel 行建立道路專案
        /// </summary>
        private async Task CreateRoadProjectFromExcelRow(ExcelRoadProjectRow row, Dictionary<string, List<string>> photoDict)
        {
            var adminDistId = _mapDBContext.AdminDist.FirstOrDefault(ad => ad.Town == row.AdministrativeDistrict)?.Id;

            // 建立 RoadProject
            var roadProject = new RoadProject
            {
                Id = Guid.NewGuid(),
                ProjectId = row.ProjectId,
                step = row.Step,
                Proposer = row.Proposer,
                AdministrativeDistrict = row.AdministrativeDistrict,
                StartPoint = row.StartPoint,
                EndPoint = row.EndPoint,
                StartEndLocation = row.StartEndLocation,
                RoadLength = row.RoadLength,
                CurrentRoadWidth = row.CurrentRoadWidth,
                PlannedRoadWidth = row.PlannedRoadWidth,
                PublicLand = row.PublicLand,
                PrivateLand = row.PrivateLand,
                PublicPrivateLand = row.PublicPrivateLand,
                ConstructionBudget = row.ConstructionBudget,
                LandAcquisitionBudget = row.LandAcquisitionBudget,
                CompensationBudget = row.CompensationBudget,
                TotalBudget = row.TotalBudget,
                Remarks = row.Remarks,
                ReviewYear = row.ReviewYear,
                CaseType = row.CaseType,
                ProjectName = row.ProjectName,
                RCCount = row.RCCount,
                TinHouseCount = row.TinHouseCount,
                ReviewResult = row.ReviewResult,
                CreateTime = DateTime.Now,
                CoordinateChecked = !row.GeocodedByApi
            };

            // 建立 Property JSON
            var projectPropObj = new Dictionary<string, string>
            {
                { "提案人", row.Proposer },
                { "行政區", row.AdministrativeDistrict },
                { "階段", row.Step },
                { "起訖位置", row.StartEndLocation },
                { "道路長度", row.RoadLength },
                { "現況路寬", row.CurrentRoadWidth },
                { "計畫路寬", row.PlannedRoadWidth },
                { "公有土地", row.PublicLand },
                { "私有土地", row.PrivateLand },
                { "公私土地", row.PublicPrivateLand },
                { "工程經費", (row.ConstructionBudget * 10000).ToString() },
                { "用地經費", (row.LandAcquisitionBudget * 10000).ToString() },
                { "補償經費", (row.CompensationBudget * 10000).ToString() },
                { "合計經費", (row.TotalBudget * 10000).ToString() },
                { "審議年度", row.ReviewYear },
                { "案件類型", row.CaseType },
                { "工程名稱", row.ProjectName },
                { "RC數量", row.RCCount },
                { "鐵皮屋數量", row.TinHouseCount },
                { "審議結果", row.ReviewResult },
                { "備註", row.Remarks }
            };
            var projectProp = JsonConvert.SerializeObject(projectPropObj);

            // 建立拓寬範圍 Area
            var expansionId = Guid.NewGuid();
            var expansionArea = new Area
            {
                Id = expansionId,
                Name = $"{row.StartEndLocation} - 預拓範圍",
                ConstructionUnit = "工務局",
                AdminDistId = adminDistId ?? Guid.Empty,
                LayerId = Guid.Parse("DB7B29A6-DF4D-4CA4-9EB7-465F9809CA0A")
            };
            await _mapDBContext.Areas.AddAsync(expansionArea);

            // 解析並建立拓寬範圍座標點
            var rangePoints = ParseCoordinatesJson(row.ExpansionRangeJson);
            if (rangePoints.Count > 0)
            {
                for (int i = 0; i < rangePoints.Count; i++)
                {
                    var point = new Point
                    {
                        Id = Guid.NewGuid(),
                        Index = i,
                        Latitude = rangePoints[i].lat,
                        Longitude = rangePoints[i].lng,
                        AreaId = expansionId,
                        Property = i == 0 ? projectProp : null
                    };
                    await _mapDBContext.Points.AddAsync(point);
                }
            }

            // 建立街景照片 Area
            var photoAreaId = Guid.NewGuid();
            var photoArea = new Area
            {
                Id = photoAreaId,
                Name = $"{row.StartEndLocation} - 街景照片",
                ConstructionUnit = "工務局",
                AdminDistId = adminDistId ?? Guid.Empty,
                LayerId = Guid.Parse("C155F3E2-42B6-4004-97C2-05E1C0EFC0E0") // 街景照片圖層
            };
            await _mapDBContext.Areas.AddAsync(photoArea);

            // 解析並建立街景照片座標點
            var photoCoords = ParsePhotoCoordinatesJson(row.StreetViewPhotoJson);
            for (int i = 0; i < photoCoords.Count; i++)
            {
                var photoPoint = new Point
                {
                    Id = Guid.NewGuid(),
                    Index = i,
                    Latitude = photoCoords[i].lat,
                    Longitude = photoCoords[i].lng,
                    AreaId = photoAreaId,
                    Property = $"{{\"url\": \"{row.ProjectId}/{photoCoords[i].photoName}\"}}"
                };
                await _mapDBContext.Points.AddAsync(photoPoint);
            }

            // 設定關聯 ID
            roadProject.PlannedExpansionId = expansionId;
            roadProject.StreetViewId = photoAreaId;

            await _mapDBContext.RoadProjects.AddAsync(roadProject);
        }

        /// <summary>
        /// 解析座標 JSON: [{"lat":24.123,"lng":121.456},...]
        /// </summary>
        private List<(double lat, double lng)> ParseCoordinatesJson(string json)
        {
            var coords = new List<(double lat, double lng)>();
            if (string.IsNullOrWhiteSpace(json)) return coords;

            try
            {
                var array = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, double>>>(json);
                if (array != null)
                {
                    foreach (var item in array)
                    {
                        if (item.TryGetValue("lat", out var lat) && item.TryGetValue("lng", out var lng))
                        {
                            coords.Add((lat, lng));
                        }
                    }
                }
            }
            catch { }

            return coords;
        }

        /// <summary>
        /// 解析照片座標 JSON: [{"lat":24.123,"lng":121.456,"photoName":"xxx.jpg"},...]
        /// </summary>
        private List<(double lat, double lng, string photoName)> ParsePhotoCoordinatesJson(string json)
        {
            var coords = new List<(double lat, double lng, string photoName)>();
            if (string.IsNullOrWhiteSpace(json)) return coords;

            try
            {
                var array = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, System.Text.Json.JsonElement>>>(json);
                if (array != null)
                {
                    foreach (var item in array)
                    {
                        double lat = 0, lng = 0;
                        string photoName = "";

                        if (item.TryGetValue("lat", out var latEl)) lat = latEl.GetDouble();
                        if (item.TryGetValue("lng", out var lngEl)) lng = lngEl.GetDouble();
                        if (item.TryGetValue("photoName", out var nameEl)) photoName = nameEl.GetString() ?? "";

                        if (lat != 0 && lng != 0)
                        {
                            coords.Add((lat, lng, photoName));
                        }
                    }
                }
            }
            catch { }

            return coords;
        }

        /// <summary>
        /// 透過 Nominatim API 搜尋路名座標
        /// 回傳第一筆符合條件（包含「臺灣」且包含行政區）的座標，若無結果則回傳 null
        /// </summary>
        private async Task<(double lat, double lng)?> SearchNominatimAsync(string district, string roadName)
        {
            if (string.IsNullOrWhiteSpace(roadName)) return null;

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("User-Agent", "RMIS/1.0");

                var query = Uri.EscapeDataString($"台灣桃園市{district}{roadName}");
                var url = $"https://nominatim.openstreetmap.org/search?q={query}&format=json";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var json = await response.Content.ReadAsStringAsync();
                var results = System.Text.Json.JsonSerializer.Deserialize<List<NominatimResult>>(json);

                if (results == null || results.Count == 0) return null;

                // 過濾：display_name 必須包含「臺灣」且包含行政區
                var filtered = results.FirstOrDefault(r =>
                    r.display_name != null &&
                    r.display_name.Contains("臺灣") &&
                    (string.IsNullOrEmpty(district) || r.display_name.Contains(district)));

                if (filtered == null) return null;

                if (double.TryParse(filtered.lat, NumberStyles.Float, CultureInfo.InvariantCulture, out var lat) &&
                    double.TryParse(filtered.lon, NumberStyles.Float, CultureInfo.InvariantCulture, out var lng))
                {
                    return (lat, lng);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Nominatim 搜尋失敗: {District} {RoadName}", district, roadName);
            }

            return null;
        }

        /// <summary>
        /// 為沒有拓寬範圍座標的匯入資料，透過路名自動查詢起點/終點座標
        /// </summary>
        private async Task GeocodeImportRowsAsync(List<ExcelRoadProjectRow> rows)
        {
            foreach (var row in rows)
            {
                // 已有拓寬範圍座標的跳過
                var existingCoords = ParseCoordinatesJson(row.ExpansionRangeJson);
                if (existingCoords.Count > 0) continue;

                // 沒有起點/終點路名也無法查詢
                if (string.IsNullOrWhiteSpace(row.StartPoint) && string.IsNullOrWhiteSpace(row.EndPoint))
                    continue;

                var coords = new List<Dictionary<string, double>>();

                // 查詢起點座標
                if (!string.IsNullOrWhiteSpace(row.StartPoint))
                {
                    var startResult = await SearchNominatimAsync(row.AdministrativeDistrict, row.StartPoint);
                    if (startResult.HasValue)
                    {
                        coords.Add(new Dictionary<string, double>
                        {
                            { "lat", startResult.Value.lat },
                            { "lng", startResult.Value.lng }
                        });
                    }

                    // Nominatim 使用政策：每秒最多 1 次請求
                    await Task.Delay(1100);
                }

                // 查詢終點座標
                if (!string.IsNullOrWhiteSpace(row.EndPoint))
                {
                    var endResult = await SearchNominatimAsync(row.AdministrativeDistrict, row.EndPoint);
                    if (endResult.HasValue)
                    {
                        coords.Add(new Dictionary<string, double>
                        {
                            { "lat", endResult.Value.lat },
                            { "lng", endResult.Value.lng }
                        });
                    }

                    await Task.Delay(1100);
                }

                if (coords.Count > 0)
                {
                    row.ExpansionRangeJson = System.Text.Json.JsonSerializer.Serialize(coords);
                    row.GeocodedByApi = true;
                    _logger.LogInformation("專案 {ProjectId}: 透過路名查詢取得 {Count} 個座標點",
                        row.ProjectId, coords.Count);
                }
            }
        }

        /// <summary>
        /// Nominatim API 回傳結果模型
        /// </summary>
        private class NominatimResult
        {
            public string lat { get; set; } = "";
            public string lon { get; set; } = "";
            public string display_name { get; set; } = "";
        }

        private string parseRoadWidthSimple(string? roadWidth, string? roadType)
        {
            // 去除使用者可能輸入的「公尺」後綴，避免重複
            var width = string.IsNullOrWhiteSpace(roadWidth)
                ? "0"
                : roadWidth.Replace("公尺", "").Trim();
            var type = string.IsNullOrEmpty(roadType) ? "" : $" ({roadType})";
            return $"{width}公尺{type}";
        }
        private async Task<List<Point>> addExpansion(Guid areaId, List<range> rangeList, string projectProp)
        {
            Console.WriteLine("addExpansion");
            try
            {
                var points = new List<Point>();
                if (rangeList == null || rangeList.Count == 0)
                {
                    return points;
                }

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
                return new List<Point>();
            }
        }

        private async Task<List<Point>> addPhoto(Guid areaId, List<photo> photoList, string projectId)
        {
            Console.WriteLine("addPhoto");
            try
            {
                var points = new List<Point>();
                if (photoList == null || photoList.Count == 0)
                {
                    return points;
                }

                for (var i = 0; i < photoList.Count; i++)
                {
                    var photoName = photoList[i].PhotoName;
                    if (photoList[i].Photo != null && !string.IsNullOrEmpty(photoName))
                    {
                        await savePhotoAsync(photoList[i].Photo, photoName, projectId);
                    }
                    // 使用 JSON 格式存儲 (前端 createPhotoPopup 期望 {"url": "..."} 格式)
                    var photoUrl = $"{projectId}/{photoList[i].PhotoName ?? ""}";
                    var photoProperty = JsonConvert.SerializeObject(new { url = photoUrl });
                    var newPoint = new Point
                    {
                        Id = Guid.NewGuid(),
                        Index = i,
                        Latitude = photoList[i].Latitude,
                        Longitude = photoList[i].Longitude,
                        AreaId = areaId,
                        Property = photoProperty
                    };
                    points.Add(newPoint);
                };
                return points;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return new List<Point>();
            }

        }
        public async Task<bool> ConfirmCoordinateAsync(Guid projectId)
        {
            var project = await _mapDBContext.RoadProjects.FindAsync(projectId);
            if (project == null) return false;

            project.CoordinateChecked = true;
            await _mapDBContext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateProjectPointsAsync(Guid projectId, List<range> rangePoints, List<photo>? photoPoints)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var roadProject = await _mapDBContext.RoadProjects.FirstOrDefaultAsync(rp => rp.Id == projectId);
                if (roadProject == null) return false;

                // 保留第一個範圍點的 Property（含專案中文欄位 JSON）
                var existingPropPoint = await _mapDBContext.Points
                    .Where(p => p.AreaId == roadProject.PlannedExpansionId)
                    .OrderBy(p => p.Index)
                    .FirstOrDefaultAsync();
                var existingProp = existingPropPoint?.Property ?? "{}";

                // 刪除現有範圍點與照片點
                var existingRangePoints = await _mapDBContext.Points
                    .Where(p => p.AreaId == roadProject.PlannedExpansionId)
                    .ToListAsync();
                if (existingRangePoints.Any())
                    _mapDBContext.Points.RemoveRange(existingRangePoints);

                var existingPhotoPoints = await _mapDBContext.Points
                    .Where(p => p.AreaId == roadProject.StreetViewId)
                    .ToListAsync();
                if (existingPhotoPoints.Any())
                    _mapDBContext.Points.RemoveRange(existingPhotoPoints);

                await _mapDBContext.SaveChangesAsync();

                // 新增範圍點
                if (rangePoints != null && rangePoints.Count > 0)
                {
                    var newRangePoints = await addExpansion(roadProject.PlannedExpansionId, rangePoints, existingProp);
                    if (newRangePoints.Count > 0)
                        await _mapDBContext.AddRangeAsync(newRangePoints);
                }

                // 新增照片點
                if (photoPoints != null && photoPoints.Count > 0)
                {
                    var newPhotoPoints = await addPhoto(roadProject.StreetViewId, photoPoints, roadProject.ProjectId);
                    if (newPhotoPoints.Count > 0)
                        await _mapDBContext.AddRangeAsync(newPhotoPoints);
                }

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "更新專案座標點失敗.");
                throw;
            }
            }); // end strategy
        }

        public async Task<Boolean> UpdateProjectDataAsync(UpdateProjectInput projectInput)
        {
            Console.WriteLine("UpdateProjectDataAsync");
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                // 根據Id = projectInput.Id 先更新 roadProject
                var roadProject = await _mapDBContext.RoadProjects.FirstOrDefaultAsync(rp => rp.Id == projectInput.Id);
                if (roadProject == null)
                {
                    return false;
                }
                projectInput.ConstructionBudget *= 10000;
                projectInput.LandAcquisitionBudget *= 10000;
                projectInput.CompensationBudget *= 10000;
                projectInput.TotalBudget *= 10000;
                var config = new MapperConfiguration(cfg =>
                {
                    cfg.CreateMap<UpdateProjectInput, RoadProject>();
                });

                var mapper = config.CreateMapper();
                mapper.Map(projectInput, roadProject);
                await _mapDBContext.SaveChangesAsync();

                // 取得與此專案對應的預拓範圍屬性點
                var roadProjectPropItem = await _mapDBContext.Points
                    .Where(p => p.AreaId == roadProject.PlannedExpansionId)
                    .OrderBy(p => p.Index)
                    .FirstOrDefaultAsync();

                if (roadProjectPropItem == null)
                {
                    _logger.LogError($"Id {projectInput.Id} 不存在預拓範圍資訊");
                    return false;
                }

                // 欄位對應表（UpdateProjectInput => Property 中的中文欄位）
                var propMap = new Dictionary<string, string>
                {
                    { "Step", "階段" },
                    { "Proposer", "提案人" },
                    { "AdministrativeDistrict", "行政區" },
                    { "StartEndLocation", "起訖位置" },
                    { "RoadLength", "道路長度" },
                    { "CurrentRoadWidth", "現況路寬" },
                    { "PlannedRoadWidth", "計畫路寬" },
                    { "PublicLand", "公有土地" },
                    { "PrivateLand", "私有土地" },
                    { "PublicPrivateLand", "公私土地" },
                    { "ConstructionBudget", "工程經費" },
                    { "LandAcquisitionBudget", "用地經費" },
                    { "CompensationBudget", "補償經費" },
                    { "TotalBudget", "合計經費" },
                    { "ReviewYear", "審議年度" },
                    { "CaseType", "案件類型" },
                    { "RCCount", "RC數量" },
                    { "TinHouseCount", "鐵皮屋數量" },
                    { "ReviewResult", "審議結果" },
                    { "Remarks", "備註" }
                };

                // 將原本 Property 字串轉換為 Dictionary
                var originalPropDict = JsonConvert.DeserializeObject<Dictionary<string, object>>(roadProjectPropItem.Property ?? "{}");

                // 擷取 projectInput 中對應的欄位，產生更新用 Dictionary
                var updatedProp = MapperHelper.A2B<UpdateProjectInput, RoadProjectProp>(projectInput);
                var updatedDict = updatedProp.GetType().GetProperties()
                    .Where(p => propMap.ContainsKey(p.Name)) // 只處理定義過的欄位
                    .ToDictionary(
                        prop => propMap[prop.Name], // 中文欄位名稱
                        prop => prop.GetValue(updatedProp)?.ToString() ?? ""
                    );

                // 將更新值合併進原本的字典
                foreach (var kvp in updatedDict)
                {
                    originalPropDict[kvp.Key] = kvp.Value;
                }

                // 重新序列化回 Property 欄位
                roadProjectPropItem.Property = JsonConvert.SerializeObject(originalPropDict);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "修改專案資料失敗.");
                throw;
            }
            }); // end strategy
        }

        public async Task<Boolean> UpdateProjectPhotoAsync(UpdateProjectPhotoInput projectPhotoInput)
        {
            // 更新圖片
            // 將/img/roadProject/PhotoName 的圖片更新
            // 1. 先刪除原本的圖片
            // 2. 新增新的圖片
            try
            {
                var photoName = projectPhotoInput.PhotoName; // 文件名，如 "6_02.png"
                var photo = projectPhotoInput.Photo; // 上傳的圖片文件

                var directoryPath = ResolvePath(_filePaths.RoadProjectPhoto);


                // 確保目標目錄存在
                if (!Directory.Exists(directoryPath))
                {
                    Directory.CreateDirectory(directoryPath);
                }

                // 構造完整的文件路徑
                var filePath = Path.Combine(directoryPath, photoName);

                // 如果文件已存在，先刪除
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }

                // 使用 FileStream 保存新文件
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    Console.WriteLine("更新圖片", photoName);
                    await photo.CopyToAsync(stream); // 使用 IFormFile 的 CopyToAsync 方法
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "更新圖片失敗.");
                return false;
            }
        }

        public async Task <List<LayersByFocusPipeline>> GetLayersByFocusPipelineAsync(int ofType)
        {
            try
            {
                Console.WriteLine("GetLayersByFocusPipelineAsync");
                var result = new List<LayersByFocusPipeline>();
                // 根據ofType取得對應的pipeline
                // 0 : 臨時道路借用申請(路線)、臨時道路借用申請(借用範團)、施工通報
                // 1 : 臨時道路借用申請(借用範團)
                // 2 : 臨時道路借用申請(路線)
                // 3 : 施工通報
                if(ofType == 0)
                {
                    var focusedPipelines = await _mapDBContext.Pipelines
                        .Where(p => p.Name.Contains("臨時道路借用申請(路線)") || p.Name.Contains("臨時道路借用申請(借用範團)") || p.Name.Contains("施工通報"))
                        .Select(p => new LayersByFocusPipeline
                        {
                            Id = p.Id,
                            Name = p.Name,
                            Layers = _mapDBContext.Layers
                                .Where(l => l.PipelineId == p.Id)
                                .Select(l => new FocusLayer
                                {
                                    id = l.Id,
                                    name = l.Name,
                                    svg = l.GeometryType.Svg
                                }).ToList()
                        }).ToListAsync();
                    result.AddRange(focusedPipelines);
                }
                else if (ofType == 1)
                {
                    var focusedPipelines = await _mapDBContext.Pipelines
                        .Where(p => p.Name.Contains("臨時道路借用申請(借用範團)"))
                        .Select(p => new LayersByFocusPipeline
                        {
                            Id = p.Id,
                            Name = p.Name,
                            Layers = _mapDBContext.Layers
                                .Where(l => l.PipelineId == p.Id)
                                .Select(l => new FocusLayer
                                {
                                    id = l.Id,
                                    name = l.Name,
                                    svg = l.GeometryType.Svg
                                }).ToList()
                        }).ToListAsync();
                    result.AddRange(focusedPipelines);
                }
                else if (ofType == 2)
                {
                    var focusedPipelines = await _mapDBContext.Pipelines
                        .Where(p => p.Name.Contains("臨時道路借用申請(路線)"))
                        .Select(p => new LayersByFocusPipeline
                        {
                            Id = p.Id,
                            Name = p.Name,
                            Layers = _mapDBContext.Layers
                                .Where(l => l.PipelineId == p.Id)
                                .Select(l => new FocusLayer
                                {
                                    id = l.Id,
                                    name = l.Name,
                                    svg = l.GeometryType.Svg
                                }).ToList()
                        }).ToListAsync();
                    result.AddRange(focusedPipelines);
                }
                else if (ofType == 3)
                {
                    var focusedPipelines = await _mapDBContext.Pipelines
                        .Where(p => p.Name.Contains("施工通報"))
                        .Select(p => new LayersByFocusPipeline
                        {
                            Id = p.Id,
                            Name = p.Name,
                            Layers = _mapDBContext.Layers
                                .Where(l => l.PipelineId == p.Id)
                                .Select(l => new FocusLayer
                                {
                                    id = l.Id,
                                    name = l.Name,
                                    svg = l.GeometryType.Svg
                                }).ToList()
                        }).ToListAsync();
                    result.AddRange(focusedPipelines);
                }
                return result;
            }
            catch
            {
                return null;
            }
        }

        public async Task<AreasByLayer> GetAreasByFocusLayerAsync(GetAreasByFocusLayerInput AreasByFocusLayerInput)
        {
            Console.WriteLine("GetAreasByFocusLayerAsync");
            try
            {
                var inputStartDate = AreasByFocusLayerInput.startDate;
                var inputEndDate = AreasByFocusLayerInput.endDate;
                // 取得目標 Layer 資料
                var focusLayer = await _mapDBContext.Layers
                    .Include(l => l.GeometryType)
                    .Where(l => l.Id == AreasByFocusLayerInput.id)
                    .FirstOrDefaultAsync();

                if (focusLayer == null) throw new Exception("Layer not found");

                // 找到該 Layer 下的所有 Area
                var areas = await _mapDBContext.Areas
                    .Where(a => a.LayerId == AreasByFocusLayerInput.id)
                    .ToListAsync();
                // 取得符合條件的 Area Id 列表
                var areaIds = areas.Select(a => a.Id).ToList();

                // 只篩選屬於這些 Areas 的 Points
                var pointsGroupedByArea = await _mapDBContext.Points
                    .Where(p => areaIds.Contains(p.AreaId) && p.Index == 0)
                    .ToListAsync();

                // 從point中取得Property
                var pointsProp = pointsGroupedByArea
                    .Select(p => new 
                    {
                        id = p.AreaId,
                        area = p.Area,
                        prop =  JObject.Parse(p.Property)
                    })
                    .ToList();
                
                // 過濾出符合日期區間的點
                List<dynamic> filterPoints; // 先在外部宣告

                if (AreasByFocusLayerInput.ofType == 3)
                {
                    filterPoints = pointsProp.Where(pp =>
                    {
                        DateTime startDate, endDate;

                        // 安全解析日期
                        bool isStartParsed = DateTime.TryParse(pp.prop["施工開始日期"]?.ToString(), out startDate);
                        bool isEndParsed = DateTime.TryParse(pp.prop["施工結束日期"]?.ToString(), out endDate);

                        return (isStartParsed && startDate >= inputStartDate && startDate <= inputEndDate) ||
                               (isEndParsed && endDate >= inputStartDate && endDate <= inputEndDate);
                    }).Select(pp => (dynamic)pp).ToList();
                }
                else
                {
                    filterPoints = pointsProp.Where(pp =>
                    {
                        DateTime startDate, endDate;

                        // 安全解析日期
                        bool isStartParsed = DateTime.TryParse(pp.prop["租借起始日"]?.ToString(), out startDate);
                        bool isEndParsed = DateTime.TryParse(pp.prop["租借結束日"]?.ToString(), out endDate);

                        return (isStartParsed && startDate >= inputStartDate && startDate <= inputEndDate) ||
                               (isEndParsed && endDate >= inputStartDate && endDate <= inputEndDate);
                    }).Select(pp => (dynamic)pp).ToList();
                }
                var filterPointIds = new HashSet<Guid>(filterPoints.Select(fp => (Guid)fp.id));
                // 組合結果
                var result = new AreasByLayer
                {
                    id = focusLayer.Id,
                    name = focusLayer.Name,
                    color = focusLayer.GeometryType.Color,
                    type = focusLayer.GeometryType.Kind,
                    svg = focusLayer.GeometryType.Svg,
                    // 根據point的property 過濾出符合的area
                    areas = _mapDBContext.Areas.Select(a => new AreaDto
                        {
                            id = a.Id,
                            ConstructionUnit = a.ConstructionUnit,
                            points = a.Points.Select(p => new PointDto
                            {
                                Index = p.Index,
                                Latitude = p.Latitude,
                                Longitude = p.Longitude,
                                Prop = p.Property
                            }).OrderBy(p => p.Index).ToList()
                        }
                    ).Where(a => filterPointIds.Contains(a.id)).ToList()
                };
                // 取得該圖層下的每一筆資料

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                throw;
            }
        }

        public async Task<int> AddConstructNoticeByExcelAsync(AddConstructNoticeByExcelInput input)
        {
            var file = input.noticeFile;
            var photoFile = input.noticePhoto;
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
                        var constructNoticeSheet = package.Workbook.Worksheets[0];
                        var constructNotices = await ParseConstructNoticeExcelAsync(constructNoticeSheet);
                        var noticeAreas = new List<Area>();
                        var noticePoints = new List<Point>();
                        for (int i = 0; i < constructNotices.Count; i++)
                        {
                            constructNotices[i].Id = Guid.NewGuid();
                            // 新增通報座標和施工範圍的area
                            var constructionLocation = constructNotices[i].ConstructionLocation;
                            var projectNumber = constructNotices[i].ProjectNumber;
                            var adminDistId = _mapDBContext.AdminDist.FirstOrDefault(ad => ad.Town == constructNotices[i].AdministrativeDistrict)?.Id;
                            var noticeId = Guid.NewGuid();
                            var noticeArea = new Area
                            {
                                Id = noticeId,
                                Name = $"{constructionLocation} - {projectNumber}",
                                ConstructionUnit = "工務局",
                                AdminDistId = adminDistId ?? Guid.Empty,
                                LayerId = Guid.Parse("B8D36E95-7C82-4ADA-BA91-C91B6162C723")
                            };
                            var point = constructNotices[i].NoticePosition.Split(",");
                            var noticePoint = new Point
                            {
                                Id = Guid.NewGuid(),
                                Index = 0,
                                Latitude = double.Parse(point[0]),
                                Longitude = double.Parse(point[1]),
                                AreaId = noticeId,
                                Property = parseNoticePropAsync(constructNotices[i])
                            };
                            constructNotices[i].PositionId = noticeArea.Id;
                            noticeAreas.Add(noticeArea);
                            noticePoints.Add(noticePoint);
                        };
                        var constructNoticeList = MapperHelper.A2B<List<ConstructNoticeExcelFormat>, List<ConstructNotice>>(constructNotices);
                        // roadProjects轉換成RoadProject型態
                        await _mapDBContext.AddRangeAsync(noticeAreas);
                        await _mapDBContext.SaveChangesAsync();
                        await _mapDBContext.AddRangeAsync(noticePoints);
                        await _mapDBContext.SaveChangesAsync();
                        await _mapDBContext.AddRangeAsync(constructNoticeList);
                        rowsAffected = await _mapDBContext.SaveChangesAsync();
                        await transaction.CommitAsync();
                    }
                }
                for (int i = 0; i < photoFile.Count; i++)
                {
                    var noticeId = photoFile[i].FileName.Split("_")[0];
                    await saveNoticePhotoAsync(photoFile[i], photoFile[i].FileName, noticeId);
                }
                return rowsAffected;
            }
            catch(Exception ex)
            {
                Console.WriteLine(ex);
                throw;
            }
        }
        private async Task<List<ConstructNoticeExcelFormat>> ParseConstructNoticeExcelAsync(ExcelWorksheet worksheet)
        {
            var result = new List<ConstructNoticeExcelFormat>();
            var rowCount = worksheet.Dimension.Rows;

            // 獲取標題行 (假設第一行為標題)
            var headers = new Dictionary<string, int>();
            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
            {
                headers[worksheet.Cells[1, col].Text.Trim()] = col;
            }
            var maxIndex = await _mapDBContext.RoadProjects.MaxAsync(rp => (int?)rp.Index) ?? 0;
            for (int row = 2; row <= rowCount; row++) // 從第2行開始讀取數據
            {
                // 獲取每一行的數據
                var notice = new ConstructNoticeExcelFormat
                {
                    LicenseNumber = headers.ContainsKey("許可證號") ? worksheet.Cells[row, headers["許可證號"]].Text.Trim() : "",
                    ProjectNumber = headers.ContainsKey("工程案號") ? worksheet.Cells[row, headers["工程案號"]].Text.Trim() : "",
                    ApprovalUnit = headers.ContainsKey("核定單位") ? worksheet.Cells[row, headers["核定單位"]].Text.Trim() : "",
                    ProjectName = headers.ContainsKey("工程名稱") ? worksheet.Cells[row, headers["工程名稱"]].Text.Trim() : "",
                    ConstructionStatus = headers.ContainsKey("施工狀態") ? worksheet.Cells[row, headers["施工狀態"]].Text.Trim() : "",
                    ConstructionStartDate = headers.ContainsKey("施工開始日期") ? ParseDateTime(worksheet.Cells[row, headers["施工開始日期"]].Text) : null,
                    ConstructionEndDate = headers.ContainsKey("施工結束日期") ? ParseDateTime(worksheet.Cells[row, headers["施工結束日期"]].Text) : null,
                    AdministrativeDistrict = headers.ContainsKey("行政區") ? worksheet.Cells[row, headers["行政區"]].Text.Trim() : "",
                    ConstructionLocation = headers.ContainsKey("施工地點") ? worksheet.Cells[row, headers["施工地點"]].Text.Trim() : "",
                    DaytimeConstructionPeriod = headers.ContainsKey("白天施工時段") ? worksheet.Cells[row, headers["白天施工時段"]].Text.Trim() : null,
                    NighttimeConstructionPeriod = headers.ContainsKey("晚上施工時段") ? worksheet.Cells[row, headers["晚上施工時段"]].Text.Trim() : null,
                    PipelineUnit = headers.ContainsKey("管線單位") ? worksheet.Cells[row, headers["管線單位"]].Text.Trim() : null,
                    ConstructionReason = headers.ContainsKey("施工原因") ? worksheet.Cells[row, headers["施工原因"]].Text.Trim() : null,
                    ChangeStatus = headers.ContainsKey("變更狀態") ? worksheet.Cells[row, headers["變更狀態"]].Text.Trim() : null,
                    ChangeDate = headers.ContainsKey("變更日期") ? ParseDateTime(worksheet.Cells[row, headers["變更日期"]].Text) : null,
                    CompletionDate = headers.ContainsKey("結案日期") ? ParseDateTime(worksheet.Cells[row, headers["結案日期"]].Text) : null,
                    BeforeConstructionPhoto = headers.ContainsKey("施工前照片") ? worksheet.Cells[row, headers["施工前照片"]].Text.Trim() : null,
                    AfterConstructionPhoto = headers.ContainsKey("施工後照片") ? worksheet.Cells[row, headers["施工後照片"]].Text.Trim() : null,
                    NoticePhoto = headers.ContainsKey("打卡告示照片") ? worksheet.Cells[row, headers["打卡告示照片"]].Text.Trim() : null,
                    TrafficControlPhoto = headers.ContainsKey("打卡交管照片") ? worksheet.Cells[row, headers["打卡交管照片"]].Text.Trim() : null,
                    ConstructionScope = headers.ContainsKey("施工範圍") ? worksheet.Cells[row, headers["施工範圍"]].Text.Trim() : "",
                    NoticePosition = headers.ContainsKey("通報座標") ? worksheet.Cells[row, headers["通報座標"]].Text.Trim() : "",
                };
                result.Add(notice);
            }

            return result;
        }
        private DateTime? ParseDateTime(string dateStr)
        {
            if (string.IsNullOrWhiteSpace(dateStr))
                return null;

            if (DateTime.TryParse(dateStr, out DateTime parsedDate))
            {
                return parsedDate.Date;
            }

            return null;
        }

        private string parseNoticePropAsync(ConstructNoticeExcelFormat constructNotice)
        {
            try
            {
                // 將 ConstructNoticeExcelFormat 的欄位名稱轉換成中文
                var constructNoticeProp = MapperHelper.A2B<ConstructNoticeExcelFormat, ConstructNotice>(constructNotice);

                // 英中欄位對應字典
                var propMap = new Dictionary<string, string>
                {
                    { "LicenseNumber", "許可證號" },
                    { "ProjectNumber", "工程案號" },
                    { "ApprovalUnit", "核定單位" },
                    { "ProjectName", "工程名稱" },
                    { "ConstructionStatus", "施工狀態" },
                    { "ConstructionStartDate", "施工開始日期" },
                    { "ConstructionEndDate", "施工結束日期" },
                    { "ConstructionLocation", "施工地點" },
                    { "DaytimeConstructionPeriod", "白天施工時段" },
                    { "NighttimeConstructionPeriod", "晚上施工時段" },
                    { "PipelineUnit", "管線單位" },
                    { "ConstructionReason", "施工原因" },
                    { "ChangeStatus", "變更狀態" },
                    { "ChangeDate", "變更日期" },
                    { "CompletionDate", "結案日期" },
                    { "BeforeConstructionPhoto", "施工前照片" },
                    { "AfterConstructionPhoto", "施工後照片" },
                    { "NoticePhoto", "打卡告示照片" },
                    { "TrafficControlPhoto", "打卡交管照片" },
                    { "ConstructionScope", "施工範圍"}
                };

                // 轉換屬性名稱與值
                var propDict = constructNoticeProp.GetType().GetProperties()
                    .Where(prop => propMap.ContainsKey(prop.Name)) // 只篩選在 propMap 中存在的欄位
                    .ToDictionary(
                        prop => propMap[prop.Name], // 轉換為中文名稱
                        prop =>
                        {
                            var value = prop.GetValue(constructNoticeProp);
                            if (value is DateTime dateValue)
                            {
                                return dateValue.ToString("yyyy-MM-dd"); // 確保日期格式
                            }
                            return value?.ToString();
                        }
                    );


                // 轉換為 JSON
                var property = JsonConvert.SerializeObject(propDict);
                return property;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
            return "";
        }

        private async Task saveNoticePhotoAsync(IFormFile noticePhoto, string photoName, string constructNoticeDic)
        {
            Console.WriteLine("savePhoto");
            try
            {
                var savePath = Path.Combine(ResolvePath(_filePaths.ConstructNoticePhoto), constructNoticeDic);
                if (!Directory.Exists(savePath))
                {
                    Directory.CreateDirectory(savePath);
                }
                var filePath = Path.Combine(savePath, photoName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await noticePhoto.CopyToAsync(stream);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
        }

        // ========== 交通事故 ==========

        private static readonly Dictionary<int, string> AccidentYearRidMap = new()
        {
            { 101, "71296d4d-8d86-4571-aae9-f8af3d0507d7" },
            { 102, "0cb05123-552d-48a6-b312-44797fa66bbd" },
            { 103, "aa37fee4-3c2c-46e4-b583-c002ca7ceeed" },
            { 104, "57d95a20-f876-4166-b21d-e1cda7565ec5" },
            { 105, "844868e4-dfec-4148-973b-1006a82dd2da" },
            { 106, "911a53af-be4e-4dbf-939e-b435227ff56a" },
            { 107, "12a7c38f-67c8-421f-b968-c5ad144c4360" },
            { 108, "f2fd3c7c-4331-4ace-900d-724f5af5aab2" },
            { 109, "f09b983d-d2e1-415a-81d5-7afe6347f954" },
            { 110, "bab715d5-d0d5-4fcf-9fb8-e24dd52f9ab9" },
            { 111, "af934167-c82d-4ca9-92e7-9ec69074ce1f" },
            { 112, "e88f783c-6375-43b7-93d6-6ec2a839da8b" },
            { 113, "16f535c0-2c16-4e1d-a103-d10e55c78fbb" }
        };

        public async Task<List<AccidentRecord>> GetAccidentDataAsync(AccidentQueryInput input)
        {
            var yearsToQuery = AccidentYearRidMap.Keys
                .Where(y => y >= input.StartYear && y <= input.EndYear)
                .OrderBy(y => y)
                .ToList();

            if (yearsToQuery.Count == 0)
                return new List<AccidentRecord>();

            int startYearAD = input.StartYear + 1911;
            int endYearAD   = input.EndYear   + 1911;
            string startDate = $"{startYearAD}{input.StartMonth:D2}01";
            string endDate   = $"{endYearAD}{input.EndMonth:D2}31";

            var allRecords = new List<AccidentRecord>();

            foreach (var year in yearsToQuery)
            {
                var dbSet = _mapDBContext.GetAccidentSet(year);

                IQueryable<Accident> query = dbSet
                    .Where(r => string.Compare(r.Date, startDate) >= 0 &&
                                string.Compare(r.Date, endDate)   <= 0 &&
                                r.Area == input.Area);

                if (!string.IsNullOrWhiteSpace(input.Road))
                    query = query.Where(r => r.Road.Contains(input.Road));

                if (!string.IsNullOrWhiteSpace(input.AccidentType))
                    query = query.Where(r => r.AccidentType == input.AccidentType);

                var records = await query
                    .Select(r => new AccidentRecord
                    {
                        Year                = r.Year,
                        Date                = r.Date,
                        Time                = r.Time,
                        Area                = r.Area,
                        Road                = r.Road,
                        Section             = r.Section,
                        Lane                = r.Lane,
                        Alley               = r.Alley,
                        IntersectionRoad    = r.IntersectionRoad,
                        IntersectionSection = r.IntersectionSection,
                        IntersectionLane    = r.IntersectionLane,
                        IntersectionAlley   = r.IntersectionAlley,
                        RoadOther           = r.RoadOther,
                        Type                = r.AccidentType,
                        Latitude            = r.Latitude  ?? "",
                        Longitude           = r.Longitude ?? "",
                    })
                    .ToListAsync();

                allRecords.AddRange(records);
            }

            return allRecords
                .OrderBy(r => r.Date)
                .ThenBy(r => r.Time)
                .ToList();
        }
        public async Task<List<AccidentRecord>> ExportAccidentDataAsync(int year, string area)
        {
            if (!AccidentYearRidMap.ContainsKey(year))
                return new List<AccidentRecord>();

            var dbSet = _mapDBContext.GetAccidentSet(year);
            IQueryable<Accident> query = dbSet.Where(r => r.Area == area);
            var result = await query
                .Select(r => new AccidentRecord
                {
                    Year = r.Year,
                    Date = r.Date,
                    Time = r.Time,
                    Area = r.Area,
                    Road = r.Road,
                    Section = r.Section,
                    Lane = r.Lane,
                    Alley = r.Alley,
                    IntersectionRoad = r.IntersectionRoad,
                    IntersectionSection = r.IntersectionSection,
                    IntersectionLane = r.IntersectionLane,
                    IntersectionAlley = r.IntersectionAlley,
                    RoadOther = r.RoadOther,
                    Type = r.AccidentType,
                    Latitude = r.Latitude ?? "",
                    Longitude = r.Longitude ?? "",
                })
                .OrderBy(r => r.Date)
                .ThenBy(r => r.Time)
                .ToListAsync();
            return result;
        }

        public async Task<List<(string Lat, string Lng)>> GetAccidentPointsByMonthAsync(int minguo, int month)
        {
            if (!AccidentYearRidMap.ContainsKey(minguo))
                return new List<(string, string)>();

            int yearAD = minguo + 1911;
            string datePrefix = $"{yearAD}{month:D2}";

            var dbSet = _mapDBContext.GetAccidentSet(minguo);
            return await dbSet
                .Where(r => r.Date.StartsWith(datePrefix)
                         && r.Latitude != null && r.Longitude != null
                         && r.Latitude != "" && r.Longitude != ""
                         && (r.AccidentType == "A1" || r.AccidentType == "A2"))
                .Select(r => ValueTuple.Create(r.Latitude!, r.Longitude!))
                .ToListAsync();
        }

        public async Task<int> SyncAccidentDataAsync(int minguo)
        {
            if (!AccidentYearRidMap.TryGetValue(minguo, out var rid))
                return 0;

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(60);

            var url = $"https://opendata.tycg.gov.tw/api/v1/dataset.api_access?rid={rid}&format=JSON&limit=200000";
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("交通事故同步失敗，年度: {Year}, 狀態碼: {StatusCode}", minguo, response.StatusCode);
                return 0;
            }

            var json = await response.Content.ReadAsStringAsync();
            var records = (minguo <= 105
                ? ParseOldFormatAccidents(json)
                : ParseNewFormatAccidents(json))
                .DistinctBy(r => (r.Date, r.Time, r.Area, r.Road, r.AccidentType))
                .ToList();

            var dbSet = _mapDBContext.GetAccidentSet(minguo);
            await _mapDBContext.Database.ExecuteSqlRawAsync($"DELETE FROM accident_{minguo}");
            await dbSet.AddRangeAsync(records);
            return await _mapDBContext.SaveChangesAsync();
        }

        private static List<Accident> ParseOldFormatAccidents(string json)
        {
            var result = new List<Accident>();
            using var doc = JsonDocument.Parse(json);
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                string yearStr  = el.TryGetProperty("year",      out var y)  ? y.GetString()  ?? "" : "";
                string monthStr = el.TryGetProperty("month",     out var mo) ? mo.GetString() ?? "" : "";
                string dayStr   = el.TryGetProperty("date",      out var d)  ? d.GetString()  ?? "" : "";
                string timeStr  = el.TryGetProperty("time",      out var t)  ? t.GetString()  ?? "" : "";

                // 民國年 → 西元年，組合 YYYYMMDD
                string date = "";
                if (int.TryParse(yearStr, out int minguo) &&
                    int.TryParse(monthStr, out int month) &&
                    int.TryParse(dayStr, out int day))
                {
                    date = $"{minguo + 1911}{month:D2}{day:D2}";
                }

                result.Add(new Accident
                {
                    Year         = int.TryParse(yearStr, out int y2) ? (y2 + 1911).ToString() : yearStr,
                    Date         = date,
                    Time         = NormalizeOldTime(timeStr),
                    AccidentType = el.TryGetProperty("type",        out var tp) ? tp.GetString() ?? "" : "",
                    LocationType = "",
                    County       = el.TryGetProperty("county",      out var co) ? co.GetString() ?? "" : "",
                    CountyCode   = el.TryGetProperty("countycode",  out var cc) ? cc.GetString() ?? "" : "",
                    Area         = el.TryGetProperty("area",        out var ar) ? ar.GetString() ?? "" : "",
                    AreaCode     = el.TryGetProperty("areacode",    out var ac) ? ac.GetString() ?? "" : "",
                    Road         = el.TryGetProperty("road",        out var ro) ? ro.GetString() ?? "" : "",
                    Section              = null,
                    Lane                 = null,
                    Alley                = null,
                    IntersectionRoad     = null,
                    IntersectionSection  = null,
                    IntersectionLane     = null,
                    IntersectionAlley    = null,
                    RoadOther            = null,
                    Longitude    = el.TryGetProperty("longitude",   out var lon) ? lon.GetString() : null,
                    Latitude     = el.TryGetProperty("latitude",    out var lat) ? lat.GetString() : null,
                });
            }
            return result;
        }

        private static List<Accident> ParseNewFormatAccidents(string json)
        {
            var result = new List<Accident>();
            using var doc = JsonDocument.Parse(json);
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                result.Add(new Accident
                {
                    Year         = el.TryGetProperty("year",                 out var v1)  ? v1.GetString()  ?? "" : "",
                    Date         = el.TryGetProperty("date",                 out var v2)  ? v2.GetString()  ?? "" : "",
                    Time         = NormalizeNewTime(el.TryGetProperty("time", out var v3)  ? v3.GetString()  ?? "" : ""),
                    AccidentType = el.TryGetProperty("accident_type",        out var v4)  ? v4.GetString()  ?? "" : "",
                    LocationType = el.TryGetProperty("location_type",        out var v5)  ? v5.GetString()  : null,
                    County       = el.TryGetProperty("county",               out var v6)  ? v6.GetString()  ?? "" : "",
                    CountyCode   = el.TryGetProperty("countycode",           out var v7)  ? v7.GetString()  ?? "" : "",
                    Area         = el.TryGetProperty("area",                 out var v8)  ? v8.GetString()  ?? "" : "",
                    AreaCode     = el.TryGetProperty("areacode",             out var v9)  ? v9.GetString()  ?? "" : "",
                    Road         = el.TryGetProperty("road",                 out var v10) ? v10.GetString() ?? "" : "",
                    Section            = ArabicToChineseSection(el.TryGetProperty("section",            out var v11) ? v11.GetString() : null),
                    Lane               = el.TryGetProperty("lane",               out var v12) ? v12.GetString() : null,
                    Alley              = el.TryGetProperty("alley",              out var v13) ? v13.GetString() : null,
                    IntersectionRoad   = el.TryGetProperty("intersection_road",  out var v14) ? v14.GetString() : null,
                    IntersectionSection= ArabicToChineseSection(el.TryGetProperty("intersection_section",out var v15) ? v15.GetString() : null),
                    IntersectionLane   = el.TryGetProperty("intersection_lane",  out var v16) ? v16.GetString() : null,
                    IntersectionAlley  = el.TryGetProperty("intersection_alley", out var v17) ? v17.GetString() : null,
                    RoadOther          = el.TryGetProperty("road_other",         out var v18) ? v18.GetString() : null,
                    Longitude  = el.TryGetProperty("longitude",  out var v19) ? v19.GetString() : null,
                    Latitude   = el.TryGetProperty("latitude",   out var v20) ? v20.GetString() : null,
                });
            }
            return result;
        }

        /// <summary>
        /// 將阿拉伯數字路段編號轉為中文，例如 "3" → "三"，非數字則原樣回傳
        /// </summary>
        private static string? ArabicToChineseSection(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return value;
            if (!int.TryParse(value, out int num) || num <= 0) return value;

            if (num >= 100) return value; // 超出範圍，原樣回傳

            string[] ones = { "", "一", "二", "三", "四", "五", "六", "七", "八", "九" };
            if (num < 10)  return ones[num];
            if (num == 10) return "十";
            if (num < 20)  return "十" + ones[num % 10];
            if (num % 10 == 0) return ones[num / 10] + "十";
            return ones[num / 10] + "十" + ones[num % 10];
        }

        /// <summary>
        /// 舊格式 time (如 "02:17:12658PM") → 數字編碼 (如 "141712")
        /// </summary>
        private static string NormalizeOldTime(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "";
            try
            {
                bool isPM = raw.IndexOf("PM", StringComparison.OrdinalIgnoreCase) >= 0;
                bool isAM = raw.IndexOf("AM", StringComparison.OrdinalIgnoreCase) >= 0;

                var cleaned = Regex.Replace(raw, @"[AaPp][Mm]", "").Trim();
                var parts = cleaned.Split(':');
                if (parts.Length < 2) return raw;

                int h = int.Parse(parts[0]);
                int m = int.Parse(parts[1]);
                int s = parts.Length >= 3 && parts[2].Length >= 2
                    ? int.Parse(parts[2].Substring(0, 2))
                    : 0;

                if (isPM && h != 12) h += 12;
                if (isAM && h == 12) h = 0;

                return $"{h:D2}:{m:D2}:{s:D2}";
            }
            catch
            {
                return raw;
            }
        }

        /// <summary>
        /// 新格式 time (如 "20108" 或 "141712") → hh:mm:ss 24小時制
        /// </summary>
        private static string NormalizeNewTime(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "";
            try
            {
                // 左補零至 6 碼，統一以 HHMMSS 解析
                var padded = raw.PadLeft(6, '0');
                if (padded.Length > 6) padded = padded.Substring(padded.Length - 6);

                int h = int.Parse(padded.Substring(0, 2));
                int m = int.Parse(padded.Substring(2, 2));
                int s = int.Parse(padded.Substring(4, 2));

                if (h > 23 || m > 59 || s > 59) return raw;
                return $"{h:D2}:{m:D2}:{s:D2}";
            }
            catch
            {
                return raw;
            }
        }

        // ══════════════════════════════════════════════════════════
        // 歷程匯入
        // ══════════════════════════════════════════════════════════

        private static readonly HashSet<string> ValidRecordTypes = new()
        {
            "重要里程碑", "會議記錄", "公文核定", "進度說明"
        };

        /// <summary>
        /// 解析歷程 Excel，每列建立對應的 Process 記錄，並從 ZIP 抽取對應文件。
        /// 回傳成功匯入的筆數。
        /// </summary>
        private async Task<int> ImportProcessByExcelAsync(
            IFormFile processExcelFile,
            IFormFile? processDocZipFile,
            List<string> errors)
        {
            // 1. 解析 Excel
            var rows = new List<ExcelProcessRow>();
            using (var stream = new MemoryStream())
            {
                await processExcelFile.CopyToAsync(stream);
                using var package = new ExcelPackage(stream);
                var ws = package.Workbook.Worksheets[0];
                rows = ParseProcessExcel(ws, errors);
            }

            if (rows.Count == 0) return 0;

            // 2. 驗證 ProjectId 是否存在於 DB
            var projectIds = rows.Select(r => r.ProjectId).Distinct().ToList();
            var existingProjectIds = await _mapDBContext.RoadProjects
                .Where(rp => projectIds.Contains(rp.ProjectId))
                .Select(rp => rp.ProjectId)
                .ToListAsync();

            var missingIds = projectIds.Except(existingProjectIds).ToList();
            if (missingIds.Count > 0)
            {
                errors.Add($"以下 ProjectId 不存在於道路專案: {string.Join(", ", missingIds)}");
                return 0;
            }

            // 3. 解壓縮歷程文件 ZIP 到記憶體
            // key: "{ProjectId}/{Step}/{OrderIndex}", value: list of (fileName, bytes)
            var docDict = new Dictionary<string, List<(string fileName, byte[] bytes)>>(StringComparer.OrdinalIgnoreCase);
            if (processDocZipFile != null && processDocZipFile.Length > 0)
            {
                using var memStream = new MemoryStream();
                await processDocZipFile.CopyToAsync(memStream);
                memStream.Position = 0;
                using var archive = ArchiveFactory.Open(memStream);
                foreach (var entry in archive.Entries)
                {
                    if (entry.IsDirectory) continue;
                    var entryKey = entry.Key?.Replace('\\', '/');
                    if (string.IsNullOrEmpty(entryKey)) continue;

                    var fileName = Path.GetFileName(entryKey);
                    if (string.IsNullOrEmpty(fileName) || fileName.StartsWith(".")) continue;

                    // 期望結構: {ProjectId}/{Step}/{OrderIndex}/{FileName}
                    var parts = entryKey.Split('/');
                    if (parts.Length < 4) continue;

                    var dictKey = $"{parts[0]}/{parts[1]}/{parts[2]}";
                    using var entryStream = entry.OpenEntryStream();
                    using var ms = new MemoryStream();
                    await entryStream.CopyToAsync(ms);
                    var bytes = ms.ToArray();

                    if (!docDict.ContainsKey(dictKey))
                        docDict[dictKey] = new List<(string, byte[])>();
                    docDict[dictKey].Add((fileName, bytes));
                }
            }

            // 3.1 驗證：ZIP 中每個檔案必須在對應 Excel 列的佐證文件說明（| 分隔）中列出
            if (docDict.Count > 0)
            {
                // 建立 docKey → 該列已宣告的檔名集合
                var rowFileMap = rows.ToDictionary(
                    r => $"{r.ProjectId}/{r.Step}/{r.OrderIndex}",
                    r => string.IsNullOrWhiteSpace(r.SupportingDocument)
                        ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                        : r.SupportingDocument.Split(',')
                            .Select(f => f.Trim()).Where(f => f.Length > 0)
                            .ToHashSet(StringComparer.OrdinalIgnoreCase),
                    StringComparer.OrdinalIgnoreCase);

                var docErrors = new List<string>();
                foreach (var kvp in docDict)
                {
                    if (!rowFileMap.TryGetValue(kvp.Key, out var listedFiles))
                    {
                        errors.Add($"文件壓縮檔包含找不到對應歷程列的目錄: {kvp.Key}（格式應為 ProjectId/Step/項次）");
                        continue;
                    }
                    foreach (var (fileName, _) in kvp.Value)
                    {
                        if (!listedFiles.Contains(fileName))
                            docErrors.Add($"歷程 {kvp.Key}: 壓縮檔中的「{fileName}」未列在佐證文件說明中");
                    }
                }

                if (errors.Count > 0 || docErrors.Count > 0)
                {
                    errors.AddRange(docErrors);
                    return 0;
                }
            }

            // 3.2 驗證：佐證文件說明中列出的每個檔名，壓縮檔中必須存在
            {
                var docErrors = new List<string>();
                foreach (var row in rows)
                {
                    if (string.IsNullOrWhiteSpace(row.SupportingDocument)) continue;

                    var docKey = $"{row.ProjectId}/{row.Step}/{row.OrderIndex}";
                    var requiredFiles = row.SupportingDocument.Split(',')
                        .Select(f => f.Trim()).Where(f => f.Length > 0).ToList();

                    docDict.TryGetValue(docKey, out var availableFiles);
                    var availableNames = availableFiles?
                        .Select(f => f.fileName)
                        .ToHashSet(StringComparer.OrdinalIgnoreCase)
                        ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    foreach (var requiredFile in requiredFiles)
                    {
                        if (!availableNames.Contains(requiredFile))
                            docErrors.Add(
                                $"歷程 {row.ProjectId}/Step{row.Step}/項次{row.OrderIndex}: " +
                                $"佐證文件說明中的「{requiredFile}」在壓縮檔中找不到");
                    }
                }

                if (docErrors.Count > 0)
                {
                    errors.AddRange(docErrors);
                    return 0;
                }
            }

            // 4. 逐列插入 process 記錄並儲存文件
            int importedCount = 0;
            foreach (var row in rows)
            {
                try
                {
                    var processId = await InsertProcessRowAsync(row);

                    // 儲存對應文件
                    var docKey = $"{row.ProjectId}/{row.Step}/{row.OrderIndex}";
                    if (docDict.TryGetValue(docKey, out var files))
                    {
                        var processFolder = Path.Combine(ResolvePath(_filePaths.ProcessFile), row.ProjectId, row.Step.ToString(), row.OrderIndex.ToString());
                        Directory.CreateDirectory(processFolder);

                        foreach (var (fileName, bytes) in files)
                        {
                            var filePath = Path.Combine(processFolder, fileName);
                            await File.WriteAllBytesAsync(filePath, bytes);

                            _mapDBContext.RoadProjectProcessFiles.Add(new RoadProjectProcessFile
                            {
                                Id = 0,
                                ProcessId = processId,
                                FileType = Path.GetExtension(fileName).TrimStart('.'),
                                FileName = fileName,
                                Base64String = "",
                                UploadUser = "Excel匯入",
                                FileSize = bytes.Length.ToString()
                            });
                        }
                    }

                    importedCount++;
                }
                catch (Exception ex)
                {
                    errors.Add($"歷程 {row.ProjectId}/Step{row.Step}/項次{row.OrderIndex}: {ex.Message}");
                }
            }

            await _mapDBContext.SaveChangesAsync();
            return importedCount;
        }

        /// <summary>
        /// 解析歷程 Excel 工作表
        /// </summary>
        private List<ExcelProcessRow> ParseProcessExcel(ExcelWorksheet ws, List<string> errors)
        {
            var rows = new List<ExcelProcessRow>();
            var rowCount = ws.Dimension?.Rows ?? 0;

            for (int r = 2; r <= rowCount; r++)
            {
                var projectId = ws.Cells[r, 1].Text?.Trim();
                if (string.IsNullOrEmpty(projectId)) continue;

                if (!int.TryParse(ws.Cells[r, 2].Text?.Trim(), out var step) || step < 1 || step > 3)
                {
                    errors.Add($"歷程第 {r} 行: Step 必須為 1、2 或 3");
                    continue;
                }

                if (!int.TryParse(ws.Cells[r, 3].Text?.Trim(), out var orderIndex) || orderIndex < 1)
                {
                    errors.Add($"歷程第 {r} 行: 項次必須為正整數");
                    continue;
                }

                var recordType = ws.Cells[r, 5].Text?.Trim() ?? "";
                if (!string.IsNullOrEmpty(recordType) && !ValidRecordTypes.Contains(recordType))
                {
                    errors.Add($"歷程第 {r} 行: 記錄類別「{recordType}」不合法，允許值: {string.Join("、", ValidRecordTypes)}");
                    continue;
                }

                rows.Add(new ExcelProcessRow
                {
                    ProjectId = projectId,
                    Step = step,
                    OrderIndex = orderIndex,
                    District = ws.Cells[r, 4].Text?.Trim() ?? "",
                    RecordType = recordType,
                    RecordTitle = ws.Cells[r, 6].Text?.Trim() ?? "",
                    ExecutionUnit = ws.Cells[r, 7].Text?.Trim() ?? "",
                    ConstructionUnit = ws.Cells[r, 8].Text?.Trim() ?? "",
                    ProjectName = ws.Cells[r, 9].Text?.Trim() ?? "",
                    PreviousMeetingStatus = ws.Cells[r, 10].Text?.Trim() ?? "",
                    PreviousMeetingResolution = ws.Cells[r, 11].Text?.Trim() ?? "",
                    CurrentStatus = ws.Cells[r, 12].Text?.Trim() ?? "",
                    CurrentMeetingResolution = ws.Cells[r, 13].Text?.Trim() ?? "",
                    SupportingDocument = ws.Cells[r, 14].Text?.Trim() ?? "",
                    Category = ws.Cells[r, 15].Text?.Trim() ?? "",
                    BudgetFiscalYearApprovedAmount = ws.Cells[r, 16].Text?.Trim() ?? "",
                    ContractType = ws.Cells[r, 17].Text?.Trim() ?? "",
                    ConstructionPeriod = ws.Cells[r, 18].Text?.Trim() ?? "",
                    AnnouncementCommencementDate = ws.Cells[r, 19].Text?.Trim() ?? "",
                    AwardCompletionDate = ws.Cells[r, 20].Text?.Trim() ?? "",
                });
            }

            return rows;
        }

        /// <summary>
        /// 將單筆歷程插入對應的 process 資料表，回傳生成的 ProcessId。
        /// </summary>
        private async Task<Guid> InsertProcessRowAsync(ExcelProcessRow row)
        {
            var processId = Guid.NewGuid();
            var now = DateTime.Now;

            switch (row.Step)
            {
                case 1:
                    _mapDBContext.RoadProjectProcess1.Add(new RoadProjectProcess1
                    {
                        Id = 0,
                        ProcessId = processId,
                        ProjectId = row.ProjectId,
                        OrderIndex = row.OrderIndex,
                        District = row.District,
                        RecordType = row.RecordType,
                        RecordTitle = row.RecordTitle,
                        ExecutionUnit = row.ExecutionUnit,
                        ConstructionUnit = row.ConstructionUnit,
                        ProjectName = row.ProjectName,
                        PreviousMeetingStatus = row.PreviousMeetingStatus,
                        PreviousMeetingResolution = row.PreviousMeetingResolution,
                        CurrentStatus = row.CurrentStatus,
                        CurrentMeetingResolution = row.CurrentMeetingResolution,
                        SupportingDocument = row.SupportingDocument,
                        CreatedAt = now
                    });
                    break;

                case 2:
                    _mapDBContext.RoadProjectProcess2.Add(new RoadProjectProcess2
                    {
                        Id = 0,
                        ProcessId = processId,
                        ProjectId = row.ProjectId,
                        OrderIndex = row.OrderIndex,
                        District = row.District,
                        RecordType = row.RecordType,
                        RecordTitle = row.RecordTitle,
                        ExecutionUnit = row.ExecutionUnit,
                        ConstructionUnit = row.ConstructionUnit,
                        ProjectName = row.ProjectName,
                        Category = row.Category,
                        PreviousMeetingStatus = row.PreviousMeetingStatus,
                        PreviousMeetingResolution = row.PreviousMeetingResolution,
                        CurrentStatus = row.CurrentStatus,
                        CurrentMeetingResolution = row.CurrentMeetingResolution,
                        SupportingDocument = row.SupportingDocument,
                        CreatedAt = now
                    });
                    break;

                case 3:
                    _mapDBContext.RoadProjectProcess3.Add(new RoadProjectProcess3
                    {
                        Id = 0,
                        ProcessId = processId,
                        ProjectId = row.ProjectId,
                        OrderIndex = row.OrderIndex,
                        District = row.District,
                        RecordType = row.RecordType,
                        RecordTitle = row.RecordTitle,
                        ExecutionUnit = row.ExecutionUnit,
                        ProjectName = row.ProjectName,
                        BudgetFiscalYearApprovedAmount = row.BudgetFiscalYearApprovedAmount,
                        ContractType = row.ContractType,
                        ConstructionPeriod = row.ConstructionPeriod,
                        AnnouncementCommencementDate = row.AnnouncementCommencementDate,
                        AwardCompletionDate = row.AwardCompletionDate,
                        PreviousMeetingStatus = row.PreviousMeetingStatus,
                        PreviousMeetingResolution = row.PreviousMeetingResolution,
                        CurrentStatus = row.CurrentStatus,
                        CurrentMeetingResolution = row.CurrentMeetingResolution,
                        SupportingDocument = row.SupportingDocument,
                        CreatedAt = now
                    });
                    break;

                default:
                    throw new ArgumentException($"無效的 Step 值: {row.Step}");
            }

            return processId;
        }
    }
}
