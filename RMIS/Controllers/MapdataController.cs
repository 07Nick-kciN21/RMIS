using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RMIS.Models.Account.Mapdatas;
using RMIS.Models.Auth;
using RMIS.Repositories;
using System.Text.Json;

namespace RMIS.Controllers
{
    public class MapdataController : Controller
    {
        private readonly AccountInterface _accountInterface;
        private readonly MapdataInterface _mapdataInterface;
        private readonly AdminInterface _adminInterface;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;


        public MapdataController(AccountInterface accountInterface, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext, AdminInterface adminInterface, MapdataInterface mapdataInterface)
        {
            _accountInterface = accountInterface;
            _adminInterface = adminInterface;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
            _mapdataInterface = mapdataInterface;
        }

        [HttpGet("[controller]/General/List")]
        public async Task<IActionResult> GeneralMapdataManager()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            ViewBag.Username = currentUser.UserName;
            return View();
        }

        [HttpGet("[controller]/NotGeneral/List")]
        public async Task<IActionResult> NotGeneralMapdataManager()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            ViewBag.Username = currentUser.UserName;
            return View();
        }

        [HttpPost("[controller]/Get/ManagerData")]
        public async Task<IActionResult> GetMapdataManagerData()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            var MapdataManagerData = await _mapdataInterface.GetMapdataManagerDataAsync();
            return Ok(new { success = true, MapdataManager = MapdataManagerData });
        }

        [HttpGet("[controller]/General/Read/Layer")]
        public IActionResult GeneralMapdataLayer(Guid id)
        {
            return View();
        }

        [HttpGet("[controller]/General/Read/Point")]
        public IActionResult GeneralMapdataPoint(Guid areaId, string kind)
        {
            return View();
        }

        [HttpGet("[controller]/General/Get/Point")]
        public async Task<IActionResult> GeneralGetMapdataPoint(Guid areaId)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var MapdataPoints = await _mapdataInterface.GetMapdataPointsAsync(areaId);
            if (MapdataPoints == null)
            {
                return Json(new { success = false, message = "無圖資" });
            }
            return Json(new { success = true, points = MapdataPoints, message = "取得圖資" });
        }

        [HttpPost("[controller]/General/Delete")]
        public async Task<IActionResult> DeleteMapdata(Guid id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Delete)
            {
                return Json(new { success = false, message = "無權限刪除" });
            }
            var delete = await _adminInterface.DeletePipelineAsync(id);
            if (delete == 0)
            {
                return Json(new { success = false, message = "無圖資" });
            }
            return Json(new { success = true, message = "刪除圖資" });
        }

        [HttpPost("[controller]/General/Get/Layer")]
        public async Task<IActionResult> GetMapdataLayer(Guid id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var MapdataLayers = await _mapdataInterface.GetMapdataLayersAsync(id);
            if (MapdataLayers == null)
            {
                return Json(new { success = false, message = "無圖資" });
            }
            return Json(new { success = true, layers = MapdataLayers, message = "取得圖資列表" });
        }

        [HttpPost("[controller]/General/Get/Dist")]
        public async Task<IActionResult> GetMapdataDist(Guid id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var MapdataDists = await _mapdataInterface.GetMapdataDistsAsync(id);
            if (MapdataDists == null)
            {
                return Json(new { success = false, message = "無圖資行政區" });
            }

            return Json(new { success = true, dists = MapdataDists, message = "取得圖資行政區列表" });
        }

        [HttpPost("[controller]/General/Get/Area")]
        public async Task<IActionResult> GetMapdataArea(Guid LayerId, string Dist)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var MapdataAreas = await _mapdataInterface.GetMapdataAreasAsync(LayerId, Dist);
            if (MapdataAreas == null)
            {
                return Json(new { success = false, message = "無圖資道路" });
            }

            return Json(new { success = true, areas = MapdataAreas, message = "取得圖資道路列表" });
        }

        [HttpPost("[controller]/General/Search")]
        public async Task<IActionResult> GetMapdataSearch(Guid LayerId, string Dist, Guid AreaId)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            if (LayerId == Guid.Empty || LayerId == null || Dist == "null" || Dist == null)
            {
                return Json(new { success = false, message = "未選擇圖層或行政區" });
            }

            var MapdataSearch = await _mapdataInterface.GetMapdataSearchAsync(LayerId, Dist, AreaId);
            if (MapdataSearch == null)
            {
                return Json(new { success = false, message = "無圖資" });
            }
            return Json(new { success = true, mapdataSearch = MapdataSearch, message = "取得圖資" });
        }

        [HttpPost("[controller]/General/Delete/Area")]
        public async Task<IActionResult> DeleteMapdataArea(Guid id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Delete)
            {
                return Json(new { success = false, message = "無權限刪除" });
            }
            var deleteArea = await _mapdataInterface.DeleteMapdataAreaAsync(id);
            return Json(new { success = deleteArea.Success, message = deleteArea.Message });
        }

        [HttpGet("[controller]/General/Update/Pipeline")]
        public async Task<IActionResult> GeneralUpdateMapdataPipeline(Guid id, Guid categoryId)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var pipeline = await _accountInterface.UpdatePupelineViewAsync(id);

            return View(pipeline);
        }

        [HttpPost("[controller]/General/Update/Pipeline")]
        public async Task<IActionResult> UpdateMapdataPipeline(UpdatePipeline updatePipeline)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var update = await _accountInterface.UpdatePupelineAsync(updatePipeline);

            return Json(new { success = update.Success, message = update.Message });
        }

        [HttpPost("[controller]/General/Get/Datainfo")]
        public async Task<IActionResult> GetDatainfo(Guid id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var datainfo = await _mapdataInterface.GetDatainfoAsync(id);
            return Json(new { success = datainfo.Success, datainfo = datainfo.Data, message = datainfo.Message });
        }
        [HttpGet("[controller]/General/Import")]
        public async Task<IActionResult> GeneralImportMapdata(Guid layerId, string name, string dist, string kind, string svg, string color)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            var importMapdata = new ImportMapdataView
            {
                LayerId = layerId,
                LayerName = name,
                District = dist,
                LayerKind = kind,
                LayerColor = color,
                LayerSvg = svg,
            };
            if (name == "權管土地(疑似占用)")
            {
                return View("ImportFlag");
            }
            if (name == "施工通報(道路挖掘)")
            {
                return View("ImportFocus");
            }
            if (name == "道路專案")
            {
                return View("ImportProject");
            }

            return View(importMapdata);
        }

        [HttpGet("[controller]/General/Get/LayerConfig")]
        public async Task<IActionResult> GetLayerConfig(Guid layerId)
        {
            var LayerConfig = await _mapdataInterface.GetMapdataImportSetting(layerId);
            return Json(new { success = true, LayerConfig = LayerConfig });
        }

        [HttpPost("[controller]/General/Import")]
        public async Task<IActionResult> ImportMapdata([FromForm] ImportMapdataView importMapdata)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            //var result = await _mapdataInterface.ImportMapdataAsync(importMapdata);
            return Json(new { success = true, message = "" });
        }

        // 小幫手類型
        public class ImportSettingWrapper
        {
            public List<ImportMapdataArea>? ImportMapdataAreas { get; set; }
        }


        [HttpPost("[controller]/General/Update/Datainfo")]
        public async Task<IActionResult> UpdateDatainfo([FromForm] UpdateDatainfo updateDatainfo)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限更新" });
            }
            var updated = await _mapdataInterface.UpdateDatainfoAsync(updateDatainfo);
            return Json(new { success = updated.Success, message = updated.Message });
        }

        [HttpGet("[controller]/NotGeneral/Read/Layer")]
        public IActionResult NotGeneralMapdataLayer(Guid id)
        {
            return View("");
        }
    }
}
