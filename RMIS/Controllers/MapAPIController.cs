using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using System.Linq;
using RMIS.Models.API;
using RMIS.Models.sql;
using RMIS.Repositories;
using Microsoft.AspNetCore.Identity;
using RMIS.Models.Auth;
using NetTopologySuite;
using NetTopologySuite.Geometries;


namespace RMIS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MapAPIController : ControllerBase
    {
        private readonly AdminInterface _adminInterface;
        private readonly AccountInterface _accountInterface;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly MapDBContext _mapDBContext;

        public MapAPIController(AdminInterface adminInterface, MapDBContext mapDBContext, AccountInterface accountInterface, UserManager<ApplicationUser> userManager)
        {
            _adminInterface = adminInterface;
            _mapDBContext = mapDBContext;
            _accountInterface = accountInterface;
            _userManager = userManager;
        }

        [HttpGet("GetLayers")]
        public IActionResult GetLayers(Guid pipelineId)
        {
            var layers = _mapDBContext.Layers
                .Where(l => l.PipelineId == pipelineId)
                .OrderBy(l => l.GeometryType.OrderId)
                .Select(l => new { l.Id, l.Name })
                .ToList();
            return Ok(layers);
        }

        [HttpPost("GetLayersByPipeline")]
        public async Task<LayersByPipeline> GetLayersByPipeline(Guid pipelineId)
        {
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                // 檢查權限
                var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

                if (!currentUserPermission.Read)
                {
                    return new LayersByPipeline();
                }
                var layers = await _mapDBContext.Layers
                    .Include(l => l.GeometryType)
                    .OrderBy(l => l.GeometryType.OrderId)
                    .Where(l => l.PipelineId == pipelineId)
                    .ToListAsync();
                var metaData = await _mapDBContext.Pipelines.Where(p => p.Id == pipelineId).Select(p => p.dataInfo).FirstOrDefaultAsync();
                var results = new LayersByPipeline
                {
                    metaData = metaData,
                    layers = layers.Select(l => new LayerByPipe
                    {
                        id = l.Id.ToString(),
                        name = l.Name,
                        svg = l.GeometryType.Svg,
                        kind = l.GeometryType.Kind
                    }).ToList()
                };
                return results;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new LayersByPipeline();
            }
        }

        [HttpPost("GetAreasByLayer")]
        public async Task<AreasByLayer> GetAreasByLayer(Guid LayerId)
        {
            try
            {
                var areas = await _mapDBContext.Areas
                                    .Include(a => a.Points)
                                    .Include(a => a.Layer)
                                        .ThenInclude(l => l.GeometryType)
                                    .Where(a => a.LayerId == LayerId)
                                    .ToListAsync();
                var layer = await _mapDBContext.Layers.Include(l => l.Pipeline).FirstOrDefaultAsync(l => l.Id == LayerId);
                if (areas.Count == 0)
                {
                    return new AreasByLayer();
                }
                var results = new AreasByLayer
                {
                    id = layer.Id,
                    name = layer.Name,
                    color = layer.GeometryType.Color,
                    svg = layer.GeometryType.Svg,
                    type = layer.GeometryType.Kind,
                    areas = areas.Select(a => new AreaDto
                    {
                        id = a.Id,
                        ConstructionUnit = a.ConstructionUnit,
                        points = a.Points.OrderBy(p => p.Index).Select(p => new PointDto
                        {
                            Index = p.Index,
                            Latitude = p.Latitude,
                            Longitude = p.Longitude,
                            Prop = p.Property
                        }).ToList()
                    }).ToList()
                };
                return results;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new AreasByLayer();
            }
        }

        [HttpPost("GetPointsByViewport")]
        public async Task<IActionResult> GetPointsByViewport([FromBody] ViewportRequest req)
        {
            try
            {
                var factory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
                var bbox = factory.CreatePolygon(new Coordinate[]
                {
                    new(req.MinLon, req.MinLat),
                    new(req.MaxLon, req.MinLat),
                    new(req.MaxLon, req.MaxLat),
                    new(req.MinLon, req.MaxLat),
                    new(req.MinLon, req.MinLat),
                });

                var layer = await _mapDBContext.Layers
                    .Include(l => l.GeometryType)
                    .FirstOrDefaultAsync(l => l.Id == req.LayerId);

                if (layer == null)
                    return NotFound(new { success = false, message = "找不到圖層" });

                var points = await _mapDBContext.Points
                    .Where(p => p.Area.LayerId == req.LayerId
                             && p.GeoLocation != null
                             && p.GeoLocation.Within(bbox))
                    .OrderBy(p => p.AreaId)
                    .ThenBy(p => p.Index)
                    .Select(p => new
                    {
                        p.Index,
                        p.Latitude,
                        p.Longitude,
                        p.Property,
                        areaId = p.AreaId,
                    })
                    .Take(3000)
                    .ToListAsync();

                var pointCount = points.Count;
                return Ok(new
                {
                    success = true,
                    layerId = layer.Id,
                    layerName = layer.Name,
                    color = layer.GeometryType.Color,
                    svg = layer.GeometryType.Svg,
                    type = layer.GeometryType.Kind,
                    total = pointCount,
                    points
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Viewport 查詢失敗", error = ex.Message });
            }
        }

        [HttpPost("GetLayerIdByPipeline")]
        public async Task<LayerIdByPipeline> GetLayerIdByPipeline(Guid PipelineId)
        {
            try
            {
                var LayerIdList = new LayerIdByPipeline
                {
                    LayerIdList = await _mapDBContext.Layers
                        .Where(l => l.PipelineId == PipelineId)
                        .Select(l => l.Id.ToString().ToLower())
                        .ToListAsync()
                };
                return LayerIdList;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new LayerIdByPipeline();
            }
        }

        [HttpPost("GetRoadbyName")]
        public async Task<List<RoadbyName>> GetRoadbyName(string name)
        {
            try
            {
                var result = await _mapDBContext.Areas
                    .Where(a => a.Name.StartsWith(name) && a.Layer.Pipeline.Name == "道路")
                    .Include(a => a.AdminDist)
                    .OrderBy(a => a.AdminDist.orderId)
                    .ThenBy(a => a.Name)
                    .Select(a => new RoadbyName
                    {
                        Id = a.Id.ToString(),
                        Name = a.Name + "(" + a.AdminDist.Town + ")"
                    })
                    .ToListAsync();
                return result;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new List<RoadbyName>();
            }
        }

        [HttpPost("GetPointsbyLayerId")]
        public async Task<PointsbyId> GetPointsbyLayerId(Guid LayerId)
        {
            try
            {
                var result = await _mapDBContext.Areas
                    .Include(a => a.Points)
                    .FirstOrDefaultAsync(a => a.Id == LayerId);

                if (result == null)
                {
                    return new PointsbyId();
                }

                return new PointsbyId
                {
                    Id = LayerId.ToString(),
                    Points = result.Points.OrderBy(p => p.Index).Select(p => new PointDto
                    {
                        Index = p.Index,
                        Latitude = p.Latitude,
                        Longitude = p.Longitude
                    }).ToList()
                };
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new PointsbyId();
            }
        }

        [HttpPost("GetMapSources")]
        public async Task<MapSourceOrderbyTileType> GetMapSources()
        {
            try
            {
                var mapSources = await _mapDBContext.MapSources.ToListAsync();

                var wmsSources = mapSources.Where(ms => ms.TileType == "WMS").ToList();
                var wmtsSources = mapSources.Where(ms => ms.TileType == "WMTS").ToList();

                var result = new MapSourceOrderbyTileType
                {
                    WMS = wmsSources.Select(ms => new MapSource
                    {
                        Id = ms.Id,
                        Name = ms.Name,
                        Type = ms.Type,
                        Url = ms.Url,
                        SourceId = ms.SourceId,
                        Attribution = ms.Attribution,
                        ImageFormat = ms.ImageFormat
                    }).ToList(),
                    WMTS = wmtsSources.Select(ms => new MapSource
                    {
                        Id = ms.Id,
                        Name = ms.Name,
                        Type = ms.Type,
                        Url = ms.Url,
                        SourceId = ms.SourceId,
                        Attribution = ms.Attribution,
                        ImageFormat = ms.ImageFormat
                    }).ToList()
                };

                return result;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new MapSourceOrderbyTileType();
            }
        }

        [HttpPost]
        public async Task<IActionResult> ClearData(Guid PipelineId)
        {
            var layers = await _mapDBContext.Layers
                .Where(l => l.PipelineId == PipelineId)
                .ToListAsync();

            if (layers == null || !layers.Any())
            {
                return NotFound("No layers found for the given PipelineId.");
            }

            foreach (var layer in layers)
            {
                var areas = await _mapDBContext.Areas
                    .Where(a => a.LayerId == layer.Id)
                    .ToListAsync();

                foreach (var area in areas)
                {
                    var points = await _mapDBContext.Points
                        .Where(p => p.AreaId == area.Id)
                        .ToListAsync();

                    _mapDBContext.Points.RemoveRange(points);
                }

                _mapDBContext.Areas.RemoveRange(areas);
            }

            await _mapDBContext.SaveChangesAsync();

            // 清除PipeLine底下的所有資料
            return Ok("Data cleared successfully.");
        }

        [HttpGet("GetGeoKindByPipeId")]
        public async Task<IActionResult> GetGeoKindByPipeId(Guid pipelineId)
        {
            // 先取得 layer
            var layer = await _mapDBContext.Layers
                .Where(l => l.PipelineId == pipelineId)
                .Select(l => new { l.GeometryTypeId }) // 只查詢需要的欄位
                .FirstOrDefaultAsync();

            // 檢查 layer 是否為 null
            if (layer == null)
            {
                return NotFound("PipelineId 未找到對應的 Layer 資料。");
            }

            // 透過 GeometryTypeId 取得 GeometryType
            var geometryKind = await _mapDBContext.GeometryTypes
                .Select(gt => new { gt.Id, gt.Kind })
                .FirstOrDefaultAsync(gt => gt.Id == layer.GeometryTypeId);

            if (geometryKind == null)
            {
                return NotFound("未找到對應的 GeometryType 資料。");
            }

            return Ok(geometryKind);
        }

        [HttpPost("GetFlaggedPipelines")]
        public async Task<IActionResult> GetFlaggedPipelines()
        {
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                // 檢查權限
                var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "權管土地");

                if (!currentUserPermission.Read)
                {
                    return StatusCode(500, new { success = false, message = "無權限查看" });
                }

                var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
                var flagPanelInput = await _adminInterface.GetFlaggedPipelinesAsync(userInfo);

                if (flagPanelInput != null)
                {
                    return Ok(new { success = true, flagPanelInput });
                }
                else
                {
                    return NotFound(new { success = false, message = "No flagged pipelines found" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching flagged pipelines.", error = ex.Message });
            }
        }

        // selectType：道路借用類型
        [HttpPost("GetFocusData")]
        public async Task<IActionResult> GetFocusedData([FromForm] GetFocusDataInput data)
        {
            try
            {
                var Datas = await _adminInterface.GetFocusDataAsync(data);

                if (Datas != null)
                {
                    return Ok(new { success = true, Datas });
                }
                else
                {
                    return NotFound(new { success = false, message = "無焦點資訊" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching focused pipelines.", error = ex.Message });
            }
        }

        [HttpPost("GetRoadProject")]
        public async Task<IActionResult> GetRoadProject([FromBody] GetRoadProjectInput data)
        {
            try
            {
                var roadProjects = await _adminInterface.GetProjectByAsync(data);
                // return Ok(new { success = true, data });
                if (roadProjects != null)
                {
                    return Ok(new { success = true, roadProjects });
                }
                else
                {
                    return NotFound(new { success = false, message = "No road projects found" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching road projects.", error = ex.Message });
            }
        }

        [HttpPost("GetPointsByProjectId")]
        public async Task<IActionResult> GetPointsByProjectId(Guid projectId)
        {
            try
            {
                var points = await _adminInterface.GetPointsByProjectIdAsync(projectId);

                if (points != null)
                {
                    return Ok(new { success = true, points });
                }
                else
                {
                    return NotFound(new { success = false, message = "No points found" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "取得專案座標資料失敗.", error = ex.Message });
            }
        }

        [HttpPost("GetLayersByFocusPipeline")]
        public async Task<IActionResult> GetLayersByFocusPipeline(int ofType)
        {
            try
            {
                var datas = await _adminInterface.GetLayersByFocusPipelineAsync(ofType);
                return Ok(new { success = true, datas });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "取得養工焦點圖層失敗" });
            }
        }

        [HttpPost("GetAreasByFocusLayer")]
        public async Task<IActionResult> GetAreasByFocusLayer([FromForm] GetAreasByFocusLayerInput AreasByFocusLayerInput)
        {
            try
            {
                var datas = await _adminInterface.GetAreasByFocusLayerAsync(AreasByFocusLayerInput);
                return Ok(new { success = true, datas });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "取得養工焦點圖資失敗" });
            }
        }

        [HttpPost("Get/Flag/LayerData")]
        public async Task<IActionResult> GetFlaggedLayerData(Guid id)
        {
            try
            {

                return Ok(new { success = true, messgae = "取得權管土地資料", data = "取得權管土地資料" });
            }
            catch(Exception ex)
            {
                return StatusCode(500, new { success = false, message = "取得權管土地資料失敗", error = ex.Message });
            }

        }

        [HttpGet("ExportAccidentData")]
        public async Task<IActionResult> ExportAccidentData([FromQuery] int year, [FromQuery] string area)
        {
            if (string.IsNullOrWhiteSpace(area))
                return BadRequest("請選擇行政區");

            var data = await _adminInterface.ExportAccidentDataAsync(year, area);

            static string FormatDate(string? d) =>
                d?.Length == 8 ? $"{d[..4]}/{d[4..6]}/{d[6..8]}" : d ?? "";

            static string JoinRoad(string? road, string? sec, string? lane, string? alley) =>
                string.Concat(
                    road ?? "",
                    !string.IsNullOrWhiteSpace(sec)   ? sec   + "段" : "",
                    !string.IsNullOrWhiteSpace(lane)  ? lane  + "巷" : "",
                    !string.IsNullOrWhiteSpace(alley) ? alley + "弄" : "");

            using var package = new OfficeOpenXml.ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("交通事故");

            string[] headers = { "日期", "時間", "事故類型", "行政區", "事故地點", "交叉路口", "其他地點", "緯度", "經度" };
            for (int i = 0; i < headers.Length; i++)
            {
                ws.Cells[1, i + 1].Value = headers[i];
                ws.Cells[1, i + 1].Style.Font.Bold = true;
            }

            int row = 2;
            foreach (var r in data)
            {
                ws.Cells[row, 1].Value = FormatDate(r.Date);
                ws.Cells[row, 2].Value = r.Time ?? "";
                ws.Cells[row, 3].Value = r.Type ?? "";
                ws.Cells[row, 4].Value = r.Area ?? "";
                ws.Cells[row, 5].Value = JoinRoad(r.Road, r.Section, r.Lane, r.Alley);
                ws.Cells[row, 6].Value = JoinRoad(r.IntersectionRoad, r.IntersectionSection, r.IntersectionLane, r.IntersectionAlley);
                ws.Cells[row, 7].Value = r.RoadOther ?? "";
                ws.Cells[row, 8].Value = r.Latitude ?? "";
                ws.Cells[row, 9].Value = r.Longitude ?? "";
                row++;
            }

            ws.Cells[ws.Dimension?.Address ?? "A1:I1"].AutoFitColumns();

            var bytes = package.GetAsByteArray();
            var filename = $"交通事故_{area}_{year}.xlsx";
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
        }

        [HttpPost("SyncAccidentData")]
        public async Task<IActionResult> SyncAccidentData([FromQuery] int year)
        {
            try
            {
                if (year < 101 || year > 113)
                    return BadRequest(new { success = false, message = "年份須介於 101~113" });

                var count = await _adminInterface.SyncAccidentDataAsync(year);
                return Ok(new { success = true, message = $"民國 {year} 年同步完成", count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "交通事故同步失敗", error = ex.Message });
            }
        }

        [HttpGet("GetAccidentPointsByMonth")]

        public async Task<IActionResult> GetAccidentPointsByMonth([FromQuery] int year, [FromQuery] int month)
        {
            if (year < 101 || year > 113 || month < 1 || month > 12)
                return BadRequest(new { success = false, message = "參數不正確" });

            var points = await _adminInterface.GetAccidentPointsByMonthAsync(year, month);
            var data = points.Select(p => new { lat = p.Lat, lng = p.Lng });
            return Ok(new { success = true, data });
        }

        [HttpPost("GetAccidentData")]
        public async Task<IActionResult> GetAccidentData([FromBody] AccidentQueryInput input)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(input.Area))
                    return BadRequest(new { success = false, message = "請選擇行政區" });

                if (input.StartYear < 101 || input.EndYear > 113 || input.StartYear > input.EndYear)
                    return BadRequest(new { success = false, message = "日期範圍不正確" });

                if (input.StartYear == input.EndYear && input.StartMonth > input.EndMonth)
                    return BadRequest(new { success = false, message = "起始月份不可大於結束月份" });

                var data = await _adminInterface.GetAccidentDataAsync(input);
                return Ok(new { success = true, data, total = data.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "取得交通事故資料失敗", error = ex.Message });
            }
        }
    }

    public class ViewportRequest
    {
        public Guid LayerId { get; set; }
        public double MinLat { get; set; }
        public double MaxLat { get; set; }
        public double MinLon { get; set; }
        public double MaxLon { get; set; }
    }
}
