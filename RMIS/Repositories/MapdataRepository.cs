using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Account.Mapdatas;
using RMIS.Models.Auth;
using RMIS.Models.sql;

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
                Color = layer.GeometryType.Color
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
            return Layer.ImportConfiguration;
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
        public async Task<(bool Success, string Message)> DeleteMapdataAreaAsync(Guid id)
        {
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

        public async Task<(bool Success, string Message)> ImportMapdataAsync(ImportMapdataView importMapata)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var dist = await _mapDBContext.AdminDist.FirstOrDefaultAsync(ad => ad.Town == importMapata.District);
                if (dist == null)
                    return (false, "找不到對應的行政區");

                var layerExists = await _mapDBContext.Layers.AnyAsync(l => l.Id == importMapata.LayerId);
                if (!layerExists)
                    return (false, "圖層不存在，無法新增區域");

                foreach (var mapdataArea in importMapata.ImportMapdataAreas)
                {
                    if (mapdataArea.MapdataPoints == null || mapdataArea.MapdataPoints.Count == 0)
                        return (false, $"區域 {mapdataArea.name} 沒有點資料");

                    var areaId = Guid.NewGuid();
                    var area = new Area
                    {
                        Id = areaId,
                        Name = mapdataArea.name,
                        LayerId = importMapata.LayerId,
                        ConstructionUnit = "未填寫",
                        AdminDistId = dist.Id
                    };

                    await _mapDBContext.Areas.AddAsync(area);

                    foreach (var point in mapdataArea.MapdataPoints)
                    {
                        var newPoint = new Point
                        {
                            Id = Guid.NewGuid(),
                            AreaId = areaId,
                            Index = point.Index,
                            Latitude = point.Latitude,
                            Longitude = point.Longitude,
                            Property = point.Property
                        };
                        await _mapDBContext.Points.AddAsync(newPoint);
                    }
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
    }
}
