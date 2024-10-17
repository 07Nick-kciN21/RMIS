using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;

namespace RMIS.Controllers
{
    public class AdminController : Controller
    {
        private readonly MapDBContext _mapDBContext;
        public AdminController(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        [HttpGet]
        public IActionResult AddSystem()
        {
            return View();
        }

        [HttpGet]
        public IActionResult AddPipeline()
        {
            var _Categories = _mapDBContext.Categories.ToList();
            var _GeometryTypes = _mapDBContext.GeometryTypes.OrderBy(gt => gt.OrderId).ToList();
            var input = new AddPipelineInput
            {
                Category = BuildCategorySelectList(_Categories, null),
                GeometryTypes = _GeometryTypes.Select(g => new SelectListItem
                {
                    Text = g.Name,
                    Value = g.Id.ToString()
                })
            };
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddPipeline(AddPipelineInput pipelineInput)
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
                    return RedirectToAction("AddPipeline", "Admin");
                }
                else
                {
                    // 如果 SaveChanges 沒有影響任何行
                    Console.WriteLine("", "No changes were made to the database.");
                }

                // 添加成功後轉向
                return RedirectToAction("AddPipeline", "Admin");
            }
            catch (Exception e)
            {
                // 添加錯誤訊息
                ModelState.AddModelError("", "Error: " + e.Message);
            }

            return RedirectToAction("AddPipeline", "Admin");
        }

        [HttpGet]
        public IActionResult AddRoad()
        {
            var _AdminDists = _mapDBContext.AdminDist.OrderBy(ad => ad.orderId).ToList();
            var _Pipelines = _mapDBContext.Pipelines.ToList();
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
            return View(model);
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

        [HttpGet]
        public IActionResult GetLayers(Guid pipelineId)
        {
            var layers = _mapDBContext.Layers
                .Where(l => l.PipelineId == pipelineId)
                .OrderBy(l => l.GeometryType.OrderId)
                .Select(l => new { l.Id, l.Name })
                .ToList();
            return Json(layers);
        }

        [HttpPost]
        public async Task<IActionResult> AddRoad(AddRoadInput roadInput)
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
                    return RedirectToAction("AddRoad", "Admin");
                }
                else
                {
                    // 如果 SaveChanges 沒有影響任何行
                    Console.WriteLine("", "No changes were made to the database.");
                }

                // 添加成功後轉向
                return RedirectToAction("AddRoad", "Admin");
            }
            catch (Exception e)
            {
                // 添加錯誤訊息
                ModelState.AddModelError("", "Error: " + e.Message);
            }
            return RedirectToAction("AddRoad", "Admin");
        }

        [HttpGet]
        public IActionResult AddCategory()
        {
            var parentCategories = _mapDBContext.Categories.ToList();
            var CategoryInput = new AddCategoryInput
            {
                parentCategories = BuildCategorySelectList(parentCategories, null)
            };
            return View(CategoryInput);
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

        [HttpPost]
        public async Task<IActionResult> AddCategory(AddCategoryInput categoryInput)
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
            return RedirectToAction("AddCategory", "Admin");
        }

        [HttpGet]
        public IActionResult AddGeometryType()
        {
            return View();
        }

        [HttpGet]
        public IActionResult AddMapSource()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddMapSource(AddMapSourceInput mapsourceInput)
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
            await _mapDBContext.SaveChangesAsync();

            return RedirectToAction("AddMapSource", "Admin");
        }
    }
}