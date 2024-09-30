using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models;
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
        public IActionResult Index()
        {
            var pipeline_sys = _mapDBContext.Pipeline_sys.ToList();
            return View(pipeline_sys);
        }
        [HttpGet]
        public IActionResult AddSystem()
        {
            return View();
        }

        [HttpPost]
        public IActionResult AddSystem(Pipeline_sys system)
        {
            try
            {
                Pipeline_sys sysitem = new Pipeline_sys
                {
                    Id = Guid.NewGuid(),
                    SystemName = system.SystemName
                };

                // 將新系統添加到資料庫
                _mapDBContext.Pipeline_sys.Add(sysitem);

                // 檢查 SaveChanges 返回值
                int rowsAffected = _mapDBContext.SaveChanges();

                if (rowsAffected > 0)
                {
                    // 確認數據成功寫入
                    return RedirectToAction("AddSystem", "Admin");
                }
                else
                {
                    // 如果 SaveChanges 沒有影響任何行
                    Console.WriteLine("", "No changes were made to the database.");
                }

                // 添加成功後轉向
                return RedirectToAction("AddSystem", "Admin");
            }
            catch (Exception e)
            {
                // 添加錯誤訊息
                ModelState.AddModelError("", "Error: " + e.Message);
            }
           
            return RedirectToAction("AddSystem", "Admin");
        }

        [HttpGet]
        public IActionResult AddPipeline()
        {
            // 從資料庫中取得所有 Pipeline_sys 的列表
            var pipelineSystems = _mapDBContext.Pipeline_sys.ToList();
            var Categories = _mapDBContext.Categories.ToList();
            var input = new AddPipelineInput
            {
                Category = BuildCategorySelectList(Categories, null)
            };
            // 將列表傳遞到視圖，作為選擇下拉框的資料源
            ViewBag.PipelineSystems = pipelineSystems;
            return View(input);
        }

        [HttpPost]
        public IActionResult AddPipeline(AddPipelineInput pipelineInput)
        {
            try
            {
                var pipeItem = new Pipeline
                {
                    Id = Guid.NewGuid(),
                    Name = pipelineInput.Name,
                    ManagementUnit = pipelineInput.ManagementUnit,
                    Color = pipelineInput.Color,
                    CategoryId = Guid.Parse(pipelineInput.CategoryId),
                    //PipelineSysId = Guid.Parse(pipelineInput.PipelineSysId),
                };

                // 將新管線添加到資料庫
                _mapDBContext.Pipelines.Add(pipeItem);

                // 檢查 SaveChanges 返回值
                int rowsAffected = _mapDBContext.SaveChanges();

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
            var AdminDists = _mapDBContext.AdminDist.OrderBy(ad => ad.orderId).ToList();
            var Pipelines = _mapDBContext.Pipelines.ToList();

            var RoadInput = new AddRoadInput
            {
                
                AdminDists = AdminDists.Select(p => new SelectListItem
                {
                    Text = p.City+p.Town,
                    Value = p.Id.ToString()
                }),
                Pipelines = Pipelines.Select(p => new SelectListItem
                {
                    Text = buildPipelinePath(p.CategoryId) + "/" + p.Name,
                    Value = p.Id.ToString()
                })
            };
            return View(RoadInput);
        }
        private string buildPipelinePath(Guid? parentId)
        {
            var parentCategory = _mapDBContext.Categories.FirstOrDefault(p => p.Id == parentId);
            if(parentCategory.ParentId == null)
            {
                return parentCategory.Name;
            }
            return buildPipelinePath(parentCategory.ParentId) + "/" + parentCategory.Name;
        }

        [HttpPost]
        public IActionResult AddRoad(AddRoadInput roadInput)
        {
            try
            {
                Guid Input_id = Guid.NewGuid();
                
                if(roadInput.Type == "road")
                {
                    foreach (var point in roadInput.Points)
                    {
                        var new_point = new Point
                        {
                            Id = Guid.NewGuid(),
                            RoadId = Input_id,
                            Index = point.Index,
                            Latitude = point.Latitude,
                            Longitude = point.Longitude
                        };
                        _mapDBContext.Points.AddAsync(new_point);
                    }
                    var roadItem = new Road
                    {
                        Id = Input_id,
                        Name = roadInput.Name,
                        ConstructionUnit = roadInput.ConstructionUnit,
                        AdminDistId = Guid.Parse(roadInput.AdminDistId),
                        PipelineId = Guid.Parse(roadInput.PipelineId),
                    };

                    // 將新道路添加到資料庫
                    _mapDBContext.Roads.Add(roadItem);
                }
                else if(roadInput.Type == "area")
                {
                    foreach (var point in roadInput.Points)
                    {
                        var new_point = new Point
                        {
                            Id = Guid.NewGuid(),
                            AreaId = Input_id,
                            Index = point.Index,
                            Latitude = point.Latitude,
                            Longitude = point.Longitude
                        };
                        _mapDBContext.Points.AddAsync(new_point);
                    }
                    var areaItem = new Area
                    {
                        Id = Input_id,
                        Name = roadInput.Name,
                        ConstructionUnit = roadInput.ConstructionUnit,
                        AdminDistId = Guid.Parse(roadInput.AdminDistId),
                        PipelineId = Guid.Parse(roadInput.PipelineId),
                    };

                    // 將新道路添加到資料庫
                    _mapDBContext.Areas.Add(areaItem);
                }

                // 檢查 SaveChanges 返回值
                int rowsAffected = _mapDBContext.SaveChanges();

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
                parentCategories = BuildCategorySelectList(parentCategories,null)
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
        public IActionResult AddCategory(AddCategoryInput categoryInput)
        {
            var new_category = new Category
            {
                Id = Guid.NewGuid(),
                Name = categoryInput.Name,
                ParentId = categoryInput.ParentId==null ? null : Guid.Parse(categoryInput.ParentId),
                OrderId = _mapDBContext.Categories.Count(c => c.ParentId.ToString() == categoryInput.ParentId)+1
            };
            _mapDBContext.Categories.Add(new_category);
            _mapDBContext.SaveChanges();
            return RedirectToAction("AddCategory", "Admin");
        }

    }
}
