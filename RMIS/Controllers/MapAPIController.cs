using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using RMIS.Data;
using System.Linq;
using RMIS.Models.API;
using RMIS.Models.sql;
using RMIS.Repositories;
using Microsoft.AspNetCore.Identity;
using RMIS.Models.Auth;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using NetTopologySuite.Features;
using NetTopologySuite.IO.VectorTiles;
using NetTopologySuite.IO.VectorTiles.Mapbox;
using System.Net.Http;
using Newtonsoft.Json.Linq;


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
        private readonly IMemoryCache _tileCache;
        private readonly IHttpClientFactory _httpClientFactory;

        public MapAPIController(AdminInterface adminInterface, MapDBContext mapDBContext, AccountInterface accountInterface, UserManager<ApplicationUser> userManager, IMemoryCache cache, IHttpClientFactory httpClientFactory)
        {
            _adminInterface = adminInterface;
            _mapDBContext = mapDBContext;
            _accountInterface = accountInterface;
            _tileCache = cache;
            _userManager = userManager;
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet("GetLayers")]
        public IActionResult GetLayers(int pipelineId)
        {
            var layers = _mapDBContext.Layers
                .Where(l => l.PipelineId == pipelineId)
                .OrderBy(l => l.GeometryType.OrderId)
                .Select(l => new { l.Id, l.Name })
                .ToList();
            return Ok(layers);
        }

        [HttpPost("GetLayersByPipeline")]
        public async Task<LayersByPipeline> GetLayersByPipeline(int pipelineId)
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
                        kind = l.GeometryType.Kind,
                        color = l.GeometryType.Color ?? "#3388ff"
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
        public async Task<AreasByLayer> GetAreasByLayer(int LayerId)
        {
            try
            {
                // 只投影需要的欄位，避免 EF Core 連帶 materialize Point.GeoLocation
                // （NetTopologySuite 的 SqlServerBytesReader 反序列化 geography 欄位在部分資料上會拋例外）
                var layerInfo = await _mapDBContext.Layers
                                    .Where(l => l.Id == LayerId)
                                    .Select(l => new { l.Id, l.Name, l.GeometryType.Color, l.GeometryType.Svg, l.GeometryType.Kind })
                                    .FirstOrDefaultAsync();
                if (layerInfo == null)
                {
                    return new AreasByLayer();
                }

                var areas = await _mapDBContext.Areas
                                    .Where(a => a.LayerId == LayerId)
                                    .Select(a => new AreaDto
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
                                    })
                                    .ToListAsync();
                if (areas.Count == 0)
                {
                    return new AreasByLayer();
                }
                var results = new AreasByLayer
                {
                    id = layerInfo.Id,
                    name = layerInfo.Name,
                    color = layerInfo.Color,
                    svg = layerInfo.Svg,
                    type = layerInfo.Kind,
                    areas = areas
                };
                return results;
            }
            catch (Exception e)
            {
                Console.WriteLine($"[GetAreasByLayer] LayerId={LayerId} 發生例外: {e}");
                return new AreasByLayer();
            }
        }

        [HttpPost("GetPointsByViewport")]
        public async Task<IActionResult> GetPointsByViewport([FromBody] ViewportRequest req)
        {
            try
            {
                var layer = await _mapDBContext.Layers
                    .Include(l => l.GeometryType)
                    .FirstOrDefaultAsync(l => l.Id == req.LayerId);

                if (layer == null)
                    return NotFound(new { success = false, message = "找不到圖層" });

                var factory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
                var envelope = factory.CreatePolygon(
                [
                    new Coordinate(req.MinLon, req.MinLat),
                    new Coordinate(req.MaxLon, req.MinLat),
                    new Coordinate(req.MaxLon, req.MaxLat),
                    new Coordinate(req.MinLon, req.MaxLat),
                    new Coordinate(req.MinLon, req.MinLat),
                ]);

                var points = await _mapDBContext.Points
                    .Where(p => p.Area.LayerId == req.LayerId && p.GeoLocation!.Intersects(envelope))
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
        public async Task<LayerIdByPipeline> GetLayerIdByPipeline(int PipelineId)
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
        public async Task<List<RoadbyName>> GetRoadbyName(string name, string district = null)
        {
            try
            {
                // 道路資料的行政區(Town)、道路名稱(RoadID) 存放在每個 Area 第一個點(Index == 0)的 Property JSON 中。
                // 用 SQL Server 的 JSON_VALUE 直接在資料庫端過濾，避免把整個道路PA圖層（3萬多筆）撈到記憶體逐筆解析。
                // 同一條路實際上會拆成多個 Area（路段），所以依 Town+RoadID 分組，把所有路段的 AreaId 用逗號串起來放進 Id，
                // 前端點選一筆時可以一次把整條路的所有路段查回來畫在地圖上。
                var districtParam = district ?? "";
                var nameParam = name ?? "";
                var namePattern = "%" + EscapeLike(nameParam) + "%";


                var result = await _mapDBContext.Database.SqlQuery<RoadbyName>($@"
                    SELECT
                        STRING_AGG(CAST(a.Id AS NVARCHAR(20)), ',') AS Id,
                        MAX(ISNULL(JSON_VALUE(p.Property, '$.RoadID'), N'') + N'(' + ISNULL(JSON_VALUE(p.Property, '$.Town'), N'') + N')') AS Name
                    FROM Points p
                    JOIN Areas a ON p.AreaId = a.Id
                    JOIN Layers l ON a.LayerId = l.Id
                    JOIN Pipelines pl ON l.PipelineId = pl.Id
                    WHERE p.[Index] = 0
                      AND pl.Name = N'道路PA'
                      AND ({districtParam} = N'' OR JSON_VALUE(p.Property, '$.Town') = {districtParam})
                      AND ({nameParam} = N'' OR JSON_VALUE(p.Property, '$.RoadID') LIKE {namePattern} ESCAPE '\')
                    GROUP BY JSON_VALUE(p.Property, '$.Town'), JSON_VALUE(p.Property, '$.RoadID')
                    ORDER BY JSON_VALUE(p.Property, '$.Town'), JSON_VALUE(p.Property, '$.RoadID')
                ").ToListAsync();

                return result;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new List<RoadbyName>();
            }
        }

        // 把使用者輸入中的 LIKE 萬用字元跳脫，避免搜尋字含有 % _ [ 時被當成 SQL 萬用字元
        private static string EscapeLike(string input)
        {
            return input.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_").Replace("[", "\\[");
        }

        [HttpPost("GetPointsbyLayerId")]
        public async Task<PointsbyId> GetPointsbyLayerId(int AreaId)
        {
            try
            {
                var points = await _mapDBContext.Areas
                    .Where(a => a.Id == AreaId)
                    .SelectMany(a => a.Points)
                    .OrderBy(p => p.Index)
                    .Select(p => new PointDto
                    {
                        Index = p.Index,
                        Latitude = p.Latitude,
                        Longitude = p.Longitude
                    })
                    .ToListAsync();

                if (points.Count == 0)
                {
                    return new PointsbyId();
                }

                return new PointsbyId
                {
                    Id = AreaId.ToString(),
                    Points = points
                };
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new PointsbyId();
            }
        }

        // 給道路快搜使用：一條路可能拆成多個 Area（路段），一次把所有路段的座標點都查回來，
        // 前端再逐段畫成 polyline，才能呈現整條路而不是單一路段。
        [HttpPost("GetPointsbyLayerIds")]
        public async Task<List<PointsbyId>> GetPointsbyLayerIds(string areaIds)
        {
            try
            {
                var ids = (areaIds ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => int.Parse(s.Trim()))
                    .ToList();

                var areas = await _mapDBContext.Areas
                    .Where(a => ids.Contains(a.Id))
                    .Select(a => new PointsbyId
                    {
                        Id = a.Id.ToString(),
                        Points = a.Points
                            .OrderBy(p => p.Index)
                            .Select(p => new PointDto
                            {
                                Index = p.Index,
                                Latitude = p.Latitude,
                                Longitude = p.Longitude
                            })
                            .ToList()
                    })
                    .ToListAsync();

                return areas;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new List<PointsbyId>();
            }
        }

        [HttpPost("GetMapSources")]
        public async Task<MapSourceOrderbyTileType> GetMapSources()
        {
            try
            {
                var mapSources = await _mapDBContext.MapSources.ToListAsync();

                var wmsSources  = mapSources.Where(ms => ms.TileType == "WMS").ToList();
                var wmtsSources = mapSources.Where(ms => ms.TileType == "WMTS").ToList();
                var xyzSources  = mapSources.Where(ms => ms.TileType == "XYZ").ToList();

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
                    }).ToList(),
                    XYZ = xyzSources.Select(ms => new MapSource
                    {
                        Id = ms.Id,
                        Name = ms.Name,
                        Type = ms.Type,
                        Url = ms.Url,
                        Attribution = ms.Attribution,
                        Subdomains = ms.Subdomains
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
        public async Task<IActionResult> ClearData(int PipelineId)
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
        public async Task<IActionResult> GetGeoKindByPipeId(int pipelineId)
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
        public async Task<IActionResult> GetPointsByProjectId(int projectId)
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

        [HttpGet("vtile/{layerId}/{z}/{x}/{y}")]
        public async Task<IActionResult> GetVectorTile(int layerId, int z, int x, int y)
        {
            try
            {
                var cacheKey = $"vtile:{layerId}:{z}:{x}:{y}";

                // 後端記憶體快取命中：直接回傳，不查 DB
                if (_tileCache.TryGetValue(cacheKey, out byte[]? cached))
                {
                    Response.Headers["Cache-Control"] = "public, max-age=3600";
                    return cached!.Length == 0
                        ? NoContent()
                        : File(cached!, "application/x-protobuf");
                }

                var layerInfo = await _mapDBContext.Layers
                    .Include(l => l.GeometryType)
                    .FirstOrDefaultAsync(l => l.Id == layerId);

                if (layerInfo == null) return NotFound();

                var (west, south, east, north) = TileBounds(z, x, y);
                var factory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
                var envelope = factory.CreatePolygon(
                [
                    new Coordinate(west, south),
                    new Coordinate(east, south),
                    new Coordinate(east, north),
                    new Coordinate(west, north),
                    new Coordinate(west, south),
                ]);

                // Step 1：用 Areas.BBox（由 trg_Points_SyncAreaBBox 觸發器維護、有空間索引）
                //   直接篩出跟本 tile 相交的 Area，取代原本對 Points 表全量 GroupBy 聚合再記憶體篩選的作法
                //   - 不快取空磚：防止舊錯誤結果卡在快取中造成線段持續消失
                var areaIdsInTile = await _mapDBContext.Areas
                    .Where(a => a.LayerId == layerId && a.BBox != null && a.BBox.Intersects(envelope))
                    .Select(a => a.Id)
                    .ToListAsync();

                if (areaIdsInTile.Count == 0)
                {
                    // 空磚不存入快取，讓下次請求重新查詢，避免快取污染
                    return NoContent();
                }

                // Step 2：抓那些 Area 的完整點序列（跨磚片的線段才能正確連接）
                // MapboxTileWriter 會自動裁剪超出磚片邊界的部分
                var rawPoints = await _mapDBContext.Points
                    .Where(p => areaIdsInTile.Contains(p.AreaId))
                    .OrderBy(p => p.AreaId)
                    .ThenBy(p => p.Index)
                    .Select(p => new { p.AreaId, p.Latitude, p.Longitude, p.Property })
                    .ToListAsync();

                var features = new List<IFeature>();
                var kind = layerInfo.GeometryType.Kind;

                if (kind == "line" || kind == "arrowline")
                {
                    foreach (var group in rawPoints.GroupBy(p => p.AreaId))
                    {
                        var pts = group.ToList();
                        if (pts.Count < 2) continue;
                        var coords = pts.Select(p => new Coordinate(p.Longitude, p.Latitude)).ToArray();
                        var attrs = new AttributesTable();
                        attrs.Add("areaId", group.Key);
                        attrs.Add("prop", pts[0].Property ?? "");
                        features.Add(new Feature(factory.CreateLineString(coords), attrs));
                    }
                }
                else if (kind == "point")
                {
                    foreach (var p in rawPoints)
                    {
                        var attrs = new AttributesTable();
                        attrs.Add("areaId", p.AreaId);
                        attrs.Add("prop", p.Property ?? "");
                        features.Add(new Feature(factory.CreatePoint(new Coordinate(p.Longitude, p.Latitude)), attrs));
                    }
                }
                else if (kind == "plane")
                {
                    foreach (var group in rawPoints.GroupBy(p => p.AreaId))
                    {
                        var pts = group.ToList();
                        if (pts.Count < 3) continue;
                        var coordList = pts.Select(p => new Coordinate(p.Longitude, p.Latitude)).ToList();
                        if (!coordList[0].Equals2D(coordList[^1])) coordList.Add(coordList[0]);
                        var ring = factory.CreateLinearRing(coordList.ToArray());
                        var attrs = new AttributesTable();
                        attrs.Add("areaId", group.Key);
                        attrs.Add("prop", pts[0].Property ?? "");
                        features.Add(new Feature(factory.CreatePolygon(ring), attrs));
                    }
                }

                if (features.Count == 0) return NoContent();

                var vectorTile = new VectorTile { TileId = ToTileId(x, y, z) };
                var vtLayer = new NetTopologySuite.IO.VectorTiles.Layer { Name = "layer" };
                foreach (var f in features) vtLayer.Features.Add(f);
                vectorTile.Layers.Add(vtLayer);

                using var ms = new MemoryStream();
                vectorTile.Write(ms, minLinealExtent: 0, minPolygonalExtent: 0);
                var tileBytes = ms.ToArray();

                // 寫入後端快取（1 小時）
                _tileCache.Set(cacheKey, tileBytes, TimeSpan.FromHours(1));

                // 通知瀏覽器快取（1 小時）
                Response.Headers["Cache-Control"] = "public, max-age=3600";

                return File(tileBytes, "application/x-protobuf");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Vector tile error", error = ex.Message });
            }
        }

        // OsmSharp-compatible tile ID: offset(z) + y*2^z + x
        private static ulong ToTileId(int x, int y, int z)
        {
            ulong offset = 0;
            for (int i = 0; i < z; i++) offset += 1UL << (2 * i);
            return offset + (ulong)y * (1UL << z) + (ulong)x;
        }

        private static (double west, double south, double east, double north) TileBounds(int z, int x, int y)
        {
            double n = Math.Pow(2, z);
            return (
                west:  x / n * 360.0 - 180.0,
                south: Math.Atan(Math.Sinh(Math.PI * (1.0 - 2.0 * (y + 1.0) / n))) * 180.0 / Math.PI,
                east:  (x + 1.0) / n * 360.0 - 180.0,
                north: Math.Atan(Math.Sinh(Math.PI * (1.0 - 2.0 * y / n))) * 180.0 / Math.PI
            );
        }

        [HttpGet("tile/{layerId}/{z}/{y}/{x}")]
        public async Task<IActionResult> GetTile(string layerId, int z, int y, int x)
        {
            var url = $"https://landmaps.nlsc.gov.tw/S_Maps/wmts/{layerId}/default/EPSG:3857/{z}/{y}/{x}";

            using var client = new HttpClient();
            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode);

            var bytes = await response.Content.ReadAsByteArrayAsync();
            var contentType = response.Content.Headers.ContentType?.ToString() ?? "image/png";
            return File(bytes, contentType);
        }

        [HttpGet("SearchAddress")]
        public async Task<IActionResult> SearchAddress([FromQuery] string q, [FromQuery] string? district)
        {
            if (string.IsNullOrWhiteSpace(q))
                return BadRequest(new { message = "q is required" });

            var combined = string.IsNullOrWhiteSpace(district) ? q : $"{district}{q}";
            var encoded = Uri.EscapeDataString($"台灣桃園市{combined}");
            var url = $"https://api.nlsc.gov.tw/idc/TextQueryAddress/{encoded}/20";

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "RMIS/1.0");

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode);

            var xmlText = await response.Content.ReadAsStringAsync();
            var doc = new System.Xml.XmlDocument();
            doc.LoadXml(xmlText);

            var results = doc.SelectNodes("//addressItem")
                ?.Cast<System.Xml.XmlNode>()
                .Select(n => new
                {
                    content = n.SelectSingleNode("content")?.InnerText ?? "",
                    location = n.SelectSingleNode("location")?.InnerText ?? ""
                })
                .Where(item => string.IsNullOrEmpty(district) || item.content.Contains(district))
                .ToList();

            return Ok(results);
        }
    }


    public class ViewportRequest
    {
        public int LayerId { get; set; }
        public double MinLat { get; set; }
        public double MaxLat { get; set; }
        public double MinLon { get; set; }
        public double MaxLon { get; set; }
    }
}
