using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;

namespace RMIS.Repositories
{

    public class AdminRepository: IAdminRepository
    {
        private readonly MapDBContext _mapDBContext;

        public AdminRepository(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        public async Task<Guid> AddPipeline(AddPipelineInput pipelineInput)
        {
            try
            {
                var pipelineId = Guid.NewGuid();
                var pipeItem = new Pipeline
                {
                    Id = pipelineId,
                    Name = pipelineInput.Name,
                    ManagementUnit = pipelineInput.ManagementUnit,
                    Color = pipelineInput.Color,
                    CategoryId = Guid.Parse(pipelineInput.CategoryId),
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

                if (rowsAffected > 0)
                {
                    // 確認數據成功寫入
                    return pipelineId;
                }
                else
                {
                    // 如果 SaveChanges 沒有影響任何行
                    Console.WriteLine("", "No changes were made to the database.");
                }
            }
            catch (Exception e)
            {
                // 添加錯誤訊息
                Console.WriteLine("Error: " + e.Message);
            }

            return Guid.Empty;
        }

        public async Task<Guid> AddRoad(AddRoadInput roadInput)
        {
            try
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

                if (rowsAffected > 0)
                {
                    // 確認數據成功寫入
                    return Input_id;
                }
                else
                {
                    // 如果 SaveChanges 沒有影響任何行
                    Console.WriteLine("", "No changes were made to the database.");
                }
            }
            catch (Exception e)
            {
                // 添加錯誤訊息
                Console.WriteLine("Error: " + e.Message);
            }

            return Guid.Empty;
        }

        public async Task<Guid> AddCategory(AddCategoryInput categoryInput)
        {
            var new_category = new Category
            {
                Id = Guid.NewGuid(),
                Name = categoryInput.Name,
                ParentId = categoryInput.ParentId == null ? null : Guid.Parse(categoryInput.ParentId),
                OrderId = _mapDBContext.Categories.Count(c => c.ParentId.ToString() == categoryInput.ParentId) + 1
            };
            await _mapDBContext.Categories.AddAsync(new_category);
            await _mapDBContext.SaveChangesAsync();
            return new_category.Id;
        }

        public async Task<int> AddMapSource(AddMapSourceInput mapsourceInput)
        {
            var new_mapsource = new MapSource
            {
                Url = mapsourceInput.Url,
                SourceId = mapsourceInput.SourceId,
                Name = mapsourceInput.Name,
                Type = mapsourceInput.Type,
                TileType = mapsourceInput.TileType,
                ImageFormat = mapsourceInput.ImageFormat,
                Attribution = mapsourceInput.Attribution
            };

            await _mapDBContext.MapSources.AddAsync(new_mapsource);
            return await _mapDBContext.SaveChangesAsync();
        }
    }
}
