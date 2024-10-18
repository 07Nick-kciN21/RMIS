using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using CsvHelper;
using System.Globalization;
using System.IO;
using System.Collections.Generic;
using System;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using System.Formats.Asn1;
using System.Globalization;
using CsvHelper.Configuration;


namespace RMIS.Repositories
{
    public class AdminRepository : AdminInterface
    {
        private readonly MapDBContext _mapDBContext;
        public AdminRepository(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        public async Task<AddPipelineInput> getPipelineInput()
        {
            var _Categories = await _mapDBContext.Categories.ToListAsync();
            var _GeometryTypes = await _mapDBContext.GeometryTypes.OrderBy(gt => gt.OrderId).ToListAsync();
            var input = new AddPipelineInput
            {
                Category = BuildCategorySelectList(_Categories, null),
                GeometryTypes = _GeometryTypes.Select(g => new SelectListItem
                {
                    Text = g.Name,
                    Value = g.Id.ToString()
                })
            };
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
            return rowsAffected;
        }

        public async Task<AddRoadInput> getRoadInput()
        {
            var _AdminDists = await _mapDBContext.AdminDist.OrderBy(ad => ad.orderId).ToListAsync();
            var _Pipelines = await  _mapDBContext.Pipelines.ToListAsync();
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

        public async Task<int> AddRoadByCSVAsync(AddRoadByCSVInput roadByCSVInput)
        {
            // 先組合再新增
            var layerRecords = new List<dynamic>();
            var pointRecords = new List<dynamic>();
            if (roadByCSVInput.pileCsv != null && roadByCSVInput.roadCsv != null)
            {
                // 讀取 pileCsv
                using (var pileReader = new StreamReader(roadByCSVInput.pileCsv.OpenReadStream()))
                using (var csv = new CsvReader(pileReader, CultureInfo.InvariantCulture))
                {
                    pointRecords = csv.GetRecords<dynamic>().ToList();
                }

                // 讀取 roadCsv
                using (var roadReader = new StreamReader(roadByCSVInput.roadCsv.OpenReadStream()))
                using (var csv = new CsvReader(roadReader, CultureInfo.InvariantCulture))
                {
                    layerRecords = csv.GetRecords<dynamic>().ToList();
                }
                var pilesByRoad = Convert2Dict(pointRecords, layerRecords);

                foreach(KeyValuePair<string, CSVFormat> kvp in pilesByRoad)
                {
                    var road = kvp.Value;
                    var piles = kvp.Value.piles;
                    var AreaId = Guid.NewGuid();
                    var roadItem = new Area
                    {
                        Id = AreaId,
                        Name = road.road_name,
                        AdminDistId = _mapDBContext.AdminDist.FirstOrDefault(ad => ad.City == road.road_city && ad.Town == road.road_dist).Id,
                        LayerId = Guid.Parse(roadByCSVInput.LayerId),
                        ConstructionUnit = roadByCSVInput.ConstructionUnit
                    };
                    await _mapDBContext.Areas.AddAsync(roadItem);
                    foreach (pile pile in piles)
                    {
                        var pointItem = new Point
                        {
                            Id = Guid.NewGuid(),
                            Index = pile.pile_distance,
                            Latitude = pile.pile_lat,
                            Longitude = pile.pile_lon,
                            AreaId = AreaId
                        };
                        await _mapDBContext.Points.AddAsync(pointItem);
                    }
                                    }
                var effectCount = await _mapDBContext.SaveChangesAsync();
                return effectCount;
            }
            return 0;
        }

        private Dictionary<string, CSVFormat> Convert2Dict(List<dynamic> piles, List<dynamic> roads)
        {
            Dictionary<string, CSVFormat> pilesByRoad = new Dictionary<string, CSVFormat>();
            foreach (var record in roads)
            {
                pilesByRoad.Add(record.road_id + "_1", new CSVFormat
                {
                    road_id = Convert.ToInt32(record.road_id),
                    road_name = Convert.ToString(record.road_name),
                    road_city = Convert.ToString(record.road_city),
                    road_dist = Convert.ToString(record.road_dist),
                    piles = new List<pile>()
                });
                pilesByRoad.Add(record.road_id + "_2", new CSVFormat
                {
                    road_id = Convert.ToInt32(record.road_id),
                    road_name = Convert.ToString(record.road_name),
                    road_city = Convert.ToString(record.road_city),
                    road_dist = Convert.ToString(record.road_dist),
                    piles = new List<pile>()
                });
            }

            foreach (var record in piles)
            {
                if (pilesByRoad.ContainsKey(record.road_id + "_" + record.pile_dir))
                {
                    pilesByRoad[record.road_id + "_" + record.pile_dir].piles.Add(new pile
                    {
                        pile_id = Convert.ToInt32(record.pile_id),
                        road_id = Convert.ToInt32(record.road_id),
                        pile_lat = Convert.ToDouble(record.pile_lat),
                        pile_lon = Convert.ToDouble(record.pile_lon),
                        pile_distance = Convert.ToInt32(record.pile_distance),
                        pile_dir = Convert.ToInt32(record.pile_dir)
                    });
                }
            }
            return pilesByRoad;
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
        private string buildPipelinePath(Guid? parentId)
        {
            var parentCategory = _mapDBContext.Categories.FirstOrDefault(p => p.Id == parentId);
            if (parentCategory.ParentId == null)
            {
                return parentCategory.Name;
            }
            return buildPipelinePath(parentCategory.ParentId) + "/" + parentCategory.Name;
        }
    }
}
