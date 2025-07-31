using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Account.Mapdatas;
using RMIS.Models.Auth;
using RMIS.Models.sql;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Serialization;

namespace RMIS.Repositories
{
    public class MapdataRepository : MapdataInterface
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;
        private readonly MapDBContext _mapDBContext;

        public MapdataRepository(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext, MapDBContext mapDBContext)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
            _mapDBContext = mapDBContext;
        }
        public async Task<MapdataManager> GetMapdataManagerDataAsync()
        {
            var allCategories = await _mapDBContext.Categories.ToListAsync();

            // 儲存類別順序的清單
            var categoryOrderList = new List<Guid>();

            var rootCategories = allCategories
                .Where(c => c.ParentId == null)
                .OrderBy(c => c.OrderId);

            foreach (var category in rootCategories)
            {
                BuildCategoryOrder(category.Id, allCategories, categoryOrderList);
            }

            var pipelines = await _mapDBContext.Pipelines
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.CategoryId,
                    p.IsGeneralPipeline
                }).ToListAsync();

            // 用 CategoryId 分組 pipelines
            var pipelinesByCategory = pipelines.GroupBy(p => p.CategoryId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var pipelineData = new List<PipelineData>();

            // 按照 categoryOrderList 順序插入 pipeline
            foreach (var categoryId in categoryOrderList)
            {
                if (pipelinesByCategory.TryGetValue(categoryId, out var pipelist))
                {
                    var categoryName = allCategories.First(c => c.Id == categoryId).Name;
                    foreach (var p in pipelist)
                    {
                        pipelineData.Add(new PipelineData
                        {
                            Id = p.Id,
                            Name = p.Name,
                            Category = categoryName,
                            IsGeneralPipeline = p.IsGeneralPipeline
                        });
                    }
                }
            }

            var managerData = new MapdataManager
            {
                PipelineDatas = pipelineData
            };
            return managerData;
        }

        // 這個會將 Category 的 Id 加到順序清單中
        private void BuildCategoryOrder(Guid id, List<Category> allCategories, List<Guid> orderList)
        {
            orderList.Add(id); // 儲存順序
            var childCate = allCategories.Where(c => c.ParentId == id).OrderBy(c => c.OrderId).ToList();
            foreach (var c in childCate)
            {
                BuildCategoryOrder(c.Id, allCategories, orderList);
            }
        }

        public async Task<MapdataSearch> GetMapdataSearchAsync(Guid LayerId, string Dist, Guid AreaId)
        {
            var layer = await _mapDBContext.Layers
                .Include(l => l.GeometryType)
                .FirstOrDefaultAsync(l => l.Id == LayerId);
            var dist = await _mapDBContext.AdminDist.FirstOrDefaultAsync(ad => ad.Town == Dist);
            var mapdataSearch = new MapdataSearch
            {
                Id = layer.Id,
                Name = layer.Name,
                Dist = dist.Town,
                Kind = layer.GeometryType.Kind,
                Svg = layer.GeometryType.Svg,
                Color = layer.GeometryType.Color,
                Config = layer.ImportConfiguration,
                ImportEnabled = layer.ImportEnabled
            };
            if (AreaId == Guid.Empty)
            {
                var areas = await _mapDBContext.Areas
                    .Where(a => a.AdminDist.Town == Dist && a.LayerId == LayerId)
                    .OrderBy(a => a.Name)
                    .Select(a => new MapdataArea
                    {
                        Id = a.Id,
                        Name = a.Name
                    }).ToListAsync();
                mapdataSearch.Areas = areas;
            }
            else
            {
                var areas = await _mapDBContext.Areas
                .Where(a => a.AdminDist.Town == Dist && a.Id == AreaId)
                .OrderBy(a => a.Name)
                .Select(a => new MapdataArea
                {
                    Id = a.Id,
                    Name = a.Name
                }).ToListAsync();
                mapdataSearch.Areas = areas;
            }
            return mapdataSearch;
        }

        public async Task<List<MapdataLayer>> GetMapdataLayersAsync(Guid id)
        {
            var layers = await _mapDBContext.Layers
                .Where(l => l.PipelineId == id)
                .Select(l => new MapdataLayer
                {
                    Id = l.Id,
                    Name = l.Name,
                })
                .ToListAsync();
            return layers;
        }

        public async Task<List<MapdatAdminDist>> GetMapdataDistsAsync(Guid id)
        {
            var dists = await _mapDBContext.Areas
                .Include(a => a.AdminDist)
                .OrderBy(a => a.AdminDist.orderId)
                .Where(a => a.LayerId == id)
                .Select(a => new MapdatAdminDist
                {
                    Id = a.AdminDist.Id,
                    City = a.AdminDist.City,
                    Town = a.AdminDist.Town
                })
                .Distinct()
                .ToListAsync();
            return dists;
        }

        public async Task<List<MapdataArea>> GetMapdataAreasAsync(Guid LayerId, string Dist)
        {
            var areas = await _mapDBContext.Areas
                .Include(a => a.AdminDist)
                .Where(a => a.LayerId == LayerId && a.AdminDist.Town == Dist)
                .Select(a => new MapdataArea
                {
                    Id = a.Id,
                    Name = a.Name
                })
                .Distinct()
                .OrderBy(a => a.Name) // ✅ 移到 Distinct() 後面
                .ToListAsync();
            return areas;
        }
        
        public async Task<string> GetMapdataImportSetting(Guid LayerId)
        {
            var Layer = await _mapDBContext.Layers.FindAsync(LayerId);
            // 把ImportConfiguration轉換成json
            var importConfig = Layer?.ImportConfiguration;
            if (importConfig == null)
            {
                return "沒有設定匯入配置";
            }

            return importConfig;
        }
        public async Task<List<MapdataPoint>> GetMapdataPointsAsync(Guid areaId)
        {
            var points = await _mapDBContext.Points
                .Where(p => p.AreaId == areaId)
                .OrderBy(p => p.Index)
                .Select(p => new MapdataPoint
                {
                    Index = p.Index,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Property = p.Property
                }).ToListAsync();
            return points;
        }
        public async Task<(bool Success, string Message)> DeleteMapdataAreaAsync(Guid id, string associateLayer)
        {
            switch (associateLayer)
            {
                case "RoadProject":
                    await DeleteRoadProjectAsync(id);
                    return (true, "刪除資料");
                default:
                    break;
            }
            var points = await _mapDBContext.Points.Where(p => p.AreaId == id).ToListAsync();
            var area = await _mapDBContext.Areas.FindAsync(id);
            if (area == null)
            {
                return (false, "資料不存在");
            }
            _mapDBContext.RemoveRange(points);
            _mapDBContext.Remove(area);
            await _mapDBContext.SaveChangesAsync();
            return (true, "刪除資料");
        }

        private async Task DeleteRoadProjectAsync(Guid plannedExpansionId)
        {
            var roadProject = await _mapDBContext.RoadProjects
                .FirstOrDefaultAsync(rp => rp.PlannedExpansionId == plannedExpansionId);

            if (roadProject == null)
                return;

            // 刪除街景資料
            if (roadProject.StreetViewId != Guid.Empty && roadProject.StreetViewId != plannedExpansionId)
            {
                var streetViewPoints = await _mapDBContext.Points
                    .Where(p => p.AreaId == roadProject.StreetViewId).ToListAsync();
                var streetViewArea = await _mapDBContext.Areas.FindAsync(roadProject.StreetViewId);

                _mapDBContext.RemoveRange(streetViewPoints);
                if (streetViewArea != null)
                    _mapDBContext.Remove(streetViewArea);
            }

            // 刪除預拓範圍資料
            var plannedExpansionPoints = await _mapDBContext.Points
                .Where(p => p.AreaId == plannedExpansionId).ToListAsync();
            var plannedExpansionArea = await _mapDBContext.Areas.FindAsync(plannedExpansionId);

            _mapDBContext.RemoveRange(plannedExpansionPoints);
            if (plannedExpansionArea != null)
                _mapDBContext.Remove(plannedExpansionArea);

            // 刪除 RoadProject 自身
            _mapDBContext.Remove(roadProject);

            await _mapDBContext.SaveChangesAsync();
        }


        public async Task<(bool Success, string Message)> ImportMapdataAsync(ImportMapdataView importMapata)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var layerExists = await _mapDBContext.Layers.AnyAsync(l => l.Id == importMapata.LayerId);
                if (!layerExists)
                    return (false, "圖層不存在，無法新增區域");

                var associated_table = importMapata.Associated_table;
                
                switch (associated_table)
                {
                    case "RoadProject":
                        // 先檢查所有重複的 projectId
                        var duplicateProjectIds = await CheckDuplicateProjectIds(importMapata);
                        if (duplicateProjectIds.Count != 0)
                        {
                            var duplicateIds = string.Join(", ", duplicateProjectIds);
                            return (false, $"上傳失敗 專案{duplicateIds} 已經存在");
                        }
                        break;
                    case "其他":
                        // 其他類型的處理邏輯
                        break;
                    default:
                        break;
                }

                // 用來儲存專案代號與 areaId 的對應關係（僅用於 RoadProject）
                var areaIdMapping = new Dictionary<string, Guid>();
                var streetViewIdMapping = new Dictionary<string, Guid>();

                foreach (var mapdataArea in importMapata.ImportMapdataAreas)
                {
                    if (mapdataArea.MapdataPoints == null || mapdataArea.MapdataPoints.Count == 0)
                        return (false, $"區域 {mapdataArea.name} 沒有點資料");

                    var AdminDist = mapdataArea.adminDist;
                    var DistId = await _mapDBContext.AdminDist.Where(ad => ad.Town == AdminDist).Select(ad => ad.Id).FirstOrDefaultAsync();

                    var areaId = Guid.NewGuid();
                    var area = new Area
                    {
                        Id = areaId,
                        Name = mapdataArea.name,
                        LayerId = importMapata.LayerId,
                        ConstructionUnit = "未填寫",
                        AdminDistId = DistId
                    };

                    await _mapDBContext.Areas.AddAsync(area);
                    // 如果是 RoadProject，建立專案代號與 areaId 的對應關係
                    switch (associated_table)
                    {
                        case "RoadProject":
                            var propJson = mapdataArea.MapdataPoints[0].Property;
                            var propDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(propJson);
                            if (propDict != null && propDict.TryGetValue("專案代號", out var val))
                            {
                                var projectId = val.ToString();
                                if (!string.IsNullOrEmpty(projectId))
                                {
                                    areaIdMapping[projectId] = areaId;
                                }
                            }
                            await BuildStreetViewAreasAsync(mapdataArea, streetViewIdMapping, DistId);
                            break;
                        case "其他":
                            break;
                        default:
                            break;
                    }
                    foreach (var point in mapdataArea.MapdataPoints)
                    {
                        var newPoint = new Point
                        {
                            Id = Guid.NewGuid(),
                            AreaId = areaId,
                            Index = point.Index,
                            Latitude = point.Latitude,
                            Longitude = point.Longitude,
                            Property = point.Property == "{}" ? null : point.Property
                        };
                        await _mapDBContext.Points.AddAsync(newPoint);
                    }
                }
               
                // 在處理完所有 Areas 後，再處理相關聯的資料表
                switch (associated_table)
                {
                    case "RoadProject":
                        var roadprojects = await Add2RoadProject(importMapata, areaIdMapping, streetViewIdMapping);
                        await _mapDBContext.RoadProjects.AddRangeAsync(roadprojects);
                        break;
                    case "其他":
                        // 其他類型的處理邏輯
                        break;
                    default:
                        break;
                }

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "資料匯入成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _mapDBContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, "資料匯入失敗");
            }
        }


        // 新增的檢查重複 projectId 的方法
        private async Task<List<string>> CheckDuplicateProjectIds(ImportMapdataView importMapata)
        {
            var projectIdsToCheck = new List<string>();

            // 從 ImportMapdataAreas 中提取所有 projectId
            foreach (var mapdataArea in importMapata.ImportMapdataAreas)
            {
                if (mapdataArea.MapdataPoints != null && mapdataArea.MapdataPoints.Count > 0)
                {
                    var propJson = mapdataArea.MapdataPoints[0].Property;
                    var propDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(propJson);

                    if (propDict != null && propDict.TryGetValue("專案代號", out var val))
                    {
                        var projectId = val.ToString();
                        if (!string.IsNullOrEmpty(projectId))
                        {
                            projectIdsToCheck.Add(projectId);
                        }
                    }
                }
            }

            // 檢查這些 projectId 是否已經存在於資料庫中
            var duplicateIds = new List<string>();
            if (projectIdsToCheck.Any())
            {
                var existingProjectIds = await _mapDBContext.RoadProjects
                    .Where(rp => projectIdsToCheck.Contains(rp.ProjectId))
                    .Select(rp => rp.ProjectId)
                    .Distinct()
                    .ToListAsync();

                duplicateIds.AddRange(existingProjectIds);
            }

            return duplicateIds;
        }
        private async Task BuildStreetViewAreasAsync(ImportMapdataArea mapdataArea, Dictionary<string, Guid> streetViewIdMapping, Guid adminDistId)
        {
            // 進入後 取得第一個的prop
            Console.WriteLine(mapdataArea.name);
            var propJson = mapdataArea.MapdataPoints[0].Property;
            var propDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(propJson);
            var streetViewId = await _mapDBContext.Layers.Where(l => l.Name == "街景照片").Select(l => l.Id).FirstOrDefaultAsync();
            if (propDict != null &&
                propDict.TryGetValue("專案代號", out var idVal) &&
                propDict.TryGetValue("街景照片", out var svJson) &&
                propDict.TryGetValue("起訖位置", out var locationVal) &&
                svJson.ValueKind == JsonValueKind.Object)
            {
                var projectId = idVal.ToString();
                var locationName = locationVal.ToString();
                var streetViewAreaId = Guid.NewGuid();
                var streetViewArea = new Area
                {
                    Id = streetViewAreaId,
                    Name = $"{locationName} - 街景照片",
                    LayerId = streetViewId,
                    ConstructionUnit = "未填寫",
                    AdminDistId = adminDistId
                };
                await _mapDBContext.Areas.AddAsync(streetViewArea);
                streetViewIdMapping[projectId] = streetViewAreaId;

                int index = 0;
                foreach (var photoItem in svJson.EnumerateObject())
                {
                    foreach (var coord in photoItem.Value.EnumerateArray())
                    {
                        var parts = coord.GetString()?.Split(',') ?? Array.Empty<string>();
                        if (parts.Length == 2 &&
                            double.TryParse(parts[0], out var lat) &&
                            double.TryParse(parts[1], out var lng))
                        {
                            var point = new Point
                            {
                                Id = Guid.NewGuid(),
                                AreaId = streetViewAreaId,
                                Latitude = lat,
                                Longitude = lng,
                                Index = index++,
                                Property = $"{{\"url\": \"{projectId}/{photoItem.Name}\"}}"
                            };
                            await _mapDBContext.Points.AddAsync(point);
                        }
                    }
                }
            }
        }
        private async Task<List<RoadProject>> Add2RoadProject(ImportMapdataView importMapata, Dictionary<string, Guid> areaIdMapping, Dictionary<string, Guid> streetViewIdMapping)
        {
            var roadProjects = new List<RoadProject>();
            var ImportMapdataAreas = importMapata.ImportMapdataAreas;
            if (importMapata.ImportMapdataAreas != null)
            {
                foreach (var mapdataArea in ImportMapdataAreas)
                {
                    var propJson = mapdataArea.MapdataPoints[0].Property;
                    var propDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(propJson);

                    // 安全取得值
                    string GetStr(string key) =>
                        propDict != null && propDict.TryGetValue(key, out var val) ? val.ToString() : "";

                    int GetInt(string key) =>
                        propDict != null && propDict.TryGetValue(key, out var val) &&
                        int.TryParse(val.ToString(), out var result) ? result : 0;

                    float GetFloat(string key) =>
                        propDict != null && propDict.TryGetValue(key, out var val) &&
                        float.TryParse(val.ToString(), out var result) ? result : 0f;

                    int ParseMoney(string? raw) =>
                        int.TryParse(raw?.Replace("萬", "").Trim(), out var value) ? value * 10000 : 0;

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

                        return $"{{\"路寬\":\"{width}公尺\", \"路況\":\"{condition}\"}}";
                    };

                    var projectId = GetStr("專案代號");                    
                    var project = new RoadProject
                    {
                        Id = Guid.NewGuid(),
                        ProjectId = projectId,
                        Proposer = GetStr("提案人"),
                        AdministrativeDistrict = GetStr("行政區"),
                        StartPoint = GetStr("起點"),
                        EndPoint = GetStr("終點"),
                        StartEndLocation = GetStr("起訖位置"),
                        RoadLength = float.TryParse(GetStr("道路長度").Replace("公尺", ""), out var rl) ? rl : 0,
                        CurrentRoadWidth = parseRoadWidth(GetStr("現況路寬")),
                        PlannedRoadWidth = parseRoadWidth(GetStr("計畫路寬")),
                        PublicLand = GetInt("公有土地"),
                        PrivateLand = GetInt("私有土地"),
                        PublicPrivateLand = GetInt("公私土地"),
                        ConstructionBudget = ParseMoney(GetStr("工程經費")),
                        LandAcquisitionBudget = ParseMoney(GetStr("用地經費")),
                        CompensationBudget = ParseMoney(GetStr("補償經費")),
                        TotalBudget = ParseMoney(GetStr("合計經費")),
                        Remarks = GetStr("備註"),
                        CreateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                        // 設定預拓範圍的AreaId
                        PlannedExpansionId = areaIdMapping.ContainsKey(projectId) ? areaIdMapping[projectId] : Guid.Empty,
                        StreetViewId = streetViewIdMapping.ContainsKey(projectId) ? streetViewIdMapping[projectId] : Guid.Empty // 如果需要設定街景AreaId，可以在此處理
                    };
                    roadProjects.Add(project);
                    // 建立資料夾，路徑C:/Users/KingSu/Pictures/RMIS_IMG/roadProject/{projectId}
                    var directoryPath = $"C:/Users/KingSu/Pictures/RMIS_IMG/roadProject/{projectId}";
                    Console.WriteLine(directoryPath);
                    if (!Directory.Exists(directoryPath))
                    {
                        Directory.CreateDirectory(directoryPath);
                    }                    
                }
                var PhotoDatas = importMapata.PhotoUploadData;
                // 如果有照片資料，則新增照片
                if (PhotoDatas != null && PhotoDatas.Count > 0)
                {
                    foreach (var kvp in PhotoDatas)
                    {
                        var projectId = kvp.Key;
                        var photos = kvp.Value;

                        Console.WriteLine($"Processing projectId: {projectId}, Photo count: {photos.Count}");

                        // 確保專案存在
                        var project = roadProjects.FirstOrDefault(rp => rp.ProjectId == projectId);
                        if (project != null)
                        {
                            AddPhotos(project.ProjectId, photos);
                        }
                    }
                }
            }
            return roadProjects;
        }
        private async void AddPhotos(string projectId, List<PhotoFile> photos)
        {
            for (int i = 0; i < photos.Count; i++)
            {
                var base64Photo = photos[i].Base64Data;
                await savePhotoAsync(base64Photo, photos[i].Name, projectId);
            }
        }

        // photo: base64照片 photoName:照片名稱 roadProjectDic:專案代號(照片目錄)
        private async Task savePhotoAsync(string photo, string photoName, string roadProjectDic)
        {
            Console.WriteLine($"savePhoto {photoName} to {roadProjectDic}");
            try
            {
                // 提取 Base64 字串（移除開頭的 data:image/png;base64, 部分）
                var base64Data = Regex.Replace(photo, @"^data:image/\w+;base64,", string.Empty);

                // 將 Base64 字串轉換為 byte[]
                var imageBytes = Convert.FromBase64String(base64Data);
                var directoryPath = @"C:/Users/KingSu/Pictures/RMIS_IMG/roadProject";
                // 儲存路徑（伺服器上的某個目錄）
                var savePath = Path.Combine(directoryPath, roadProjectDic);
                if (!Directory.Exists(savePath))
                {
                    Directory.CreateDirectory(savePath);
                }

                var filePath = Path.Combine(savePath, photoName);

                // 將 byte[] 寫入檔案
                await System.IO.File.WriteAllBytesAsync(filePath, imageBytes);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
        }
        private int ParseInt(string? input)
        {
            return int.TryParse(input, out var result) ? result : 0;
        }

        private float ParseFloat(string? input)
        {
            return float.TryParse(input, out var result) ? result : 0;
        }
        public async Task<(bool Success, string Message)> UpdateDatainfoAsync(UpdateDatainfo updateDatainfo)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var pipeline = await _mapDBContext.Pipelines.FindAsync(updateDatainfo.Id);
                if (pipeline == null)
                {
                    return (false, "圖資不存在");
                }
                pipeline.dataInfo = updateDatainfo.Datainfo;
                _mapDBContext.Pipelines.Update(pipeline);
                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "詮釋資料修改");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _mapDBContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, "詮釋資料修改失敗");
            }
        }

        public async Task<(bool Success, string? Data, string Message)> GetDatainfoAsync(Guid id)
        {
            var pipeline = await _mapDBContext.Pipelines.FindAsync(id);
            if (pipeline == null)
            {
                return (false, null, "圖資不存在");
            }
            if (pipeline.dataInfo == null)
            {
                return (true, null, "沒有詮釋資料");
            }
            return (true, pipeline.dataInfo, "取得詮釋資料");
        }

        public async Task<(bool Success, string Message)> ImportNotGeneralAsync(ImportMapdataView importMapata)
        {
            await ImportNotGeneralAsync(importMapata);
            return (true, "匯入成功");
        }

        private void ConstructNotices(string prop)
        {
            return;
        }
    }
}
