using Microsoft.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Caching.Memory;
using RMIS.Models.sql;

namespace RMIS.Data
{
    public class MapDBContext : DbContext
    {
        private readonly IMemoryCache _cache;

        public MapDBContext(DbContextOptions<MapDBContext> options, IMemoryCache cache) : base(options)
        {
            _cache = cache;
        }

        /// <summary>
        /// vtile 圖磚快取的版本號 cache key。GetVectorTile 把版本號編進磚片的快取 key／ETag，
        /// 版本一變舊的 key 就再也不會被命中，藉此讓 Points/Areas 異動後地圖能立刻看到最新資料，
        /// 不必等伺服器端記憶體快取或瀏覽器快取的 1 小時 TTL 過期。
        /// </summary>
        public static string TileVersionCacheKey(int layerId) => $"vtile-version:{layerId}";

        /// <summary>
        /// SaveChanges 前先記錄本次異動牽涉到哪些 LayerId 的 Points/Areas，
        /// 存完之後再統一 bump 版本號，讓對應 layer 的 vtile 快取失效。
        /// </summary>
        private async Task<HashSet<int>> CollectAffectedLayerIdsAsync()
        {
            var layerIds = new HashSet<int>();
            var areaEntries = ChangeTracker.Entries<Area>()
                .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
                .ToList();
            foreach (var e in areaEntries)
                layerIds.Add(e.Entity.LayerId);

            var pointAreaIds = ChangeTracker.Entries<Point>()
                .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
                .Select(e => e.Entity.AreaId)
                .Distinct()
                .Where(areaId => !areaEntries.Any(ae => ae.Entity.Id == areaId))
                .ToList();

            if (pointAreaIds.Count > 0)
            {
                var resolvedLayerIds = await Areas
                    .Where(a => pointAreaIds.Contains(a.Id))
                    .Select(a => a.LayerId)
                    .Distinct()
                    .ToListAsync();
                foreach (var layerId in resolvedLayerIds)
                    layerIds.Add(layerId);
            }

            return layerIds;
        }

        private void BumpTileVersions(HashSet<int> layerIds)
        {
            foreach (var layerId in layerIds)
            {
                var key = TileVersionCacheKey(layerId);
                var current = _cache.TryGetValue(key, out int v) ? v : 0;
                _cache.Set(key, current + 1);
            }
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var hasPendingPointOrAreaChanges =
                ChangeTracker.Entries<Point>().Any(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted) ||
                ChangeTracker.Entries<Area>().Any(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);

            var affectedLayerIds = hasPendingPointOrAreaChanges
                ? await CollectAffectedLayerIdsAsync()
                : null;

            var result = await base.SaveChangesAsync(cancellationToken);

            if (affectedLayerIds != null)
                BumpTileVersions(affectedLayerIds);

            return result;
        }
        public DbSet<Area> Areas { get; set; }
        public DbSet<Point> Points { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Pipeline> Pipelines { get; set; }
        public DbSet<Layer> Layers { get; set; }
        public DbSet<AdminDist> AdminDist { get; set; }
        public DbSet<MapSource> MapSources { get; set; }
        public DbSet<GeometryType> GeometryTypes { get; set; }
        public DbSet<RoadProject> RoadProjects { get; set; }
        public DbSet<ConstructNotice> ConstructNotices { get; set; }
        public DbSet<MetaData> MetaDatas { get; set; }
        public DbSet<RoadProjectProcess> RoadProjectProcesses { get; set; }
        public DbSet<RoadProjectProcessFile> RoadProjectProcessFiles { get; set; }
        public DbSet<RoadProjectRemarkFile> RoadProjectRemarkFiles { get; set; }
        public DbSet<ProcessEditLog> ProcessEditLogs { get; set; }

        /// <summary>
        /// 取得指定民國年份的交通事故 DbSet（101~113）
        /// </summary>
        public DbSet<Accident> GetAccidentSet(int minguo) =>
            Set<Accident>($"Accident{minguo}");

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.ConfigureWarnings(warnings => warnings.Ignore(SqlServerEventId.SavepointsDisabledBecauseOfMARS));
        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Define the self-referencing foreign key for the Category entity
            modelBuilder.Entity<Category>()
                .HasOne(c => c.Parent)
                .WithMany(c => c.Subcategories)
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascading deletes

            modelBuilder.Entity<RoadProject>()
                .Property(r => r.CreateTime)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<Point>()
                .Property(p => p.GeoLocation)
                .HasComputedColumnSql("geography::Point([Latitude], [Longitude], 4326)", stored: true);

            // Areas.BBox 由 trg_Points_SyncAreaBBox 觸發器維護，EF 只讀不寫，
            // 避免其他地方對 Area 的 Update 意外把 DB 算好的值覆寫成 null
            modelBuilder.Entity<Area>()
                .Property(a => a.BBox)
                .Metadata.SetBeforeSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            modelBuilder.Entity<Area>()
                .Property(a => a.BBox)
                .Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);

            // Points 資料表有 trg_Points_SyncAreaBBox 觸發器，SQL Server 不允許對有觸發器的資料表使用 OUTPUT 子句，
            // 需關閉 EF Core 8 預設的 OUTPUT 子句寫回機制，否則 INSERT/UPDATE/DELETE Points 會拋出
            // "the target table has database triggers" 錯誤
            modelBuilder.Entity<Point>()
                .ToTable(tb => tb.UseSqlOutputClause(false));

            // 交通事故 101~113（民國年）各自對應獨立資料表
            for (int year = 101; year <= 113; year++)
            {
                modelBuilder.SharedTypeEntity<Accident>($"Accident{year}")
                    .ToTable($"accident_{year}");
            }
        }
    }
}