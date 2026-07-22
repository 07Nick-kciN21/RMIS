using Microsoft.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RMIS.Models.sql;

namespace RMIS.Data
{
    public class MapDBContext : DbContext
    {
        public MapDBContext(DbContextOptions<MapDBContext> options) : base(options)
        {
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
        public DbSet<RoadProjectProcess1> RoadProjectProcess1 { get; set; }
        public DbSet<RoadProjectProcess2> RoadProjectProcess2 { get; set; }
        public DbSet<RoadProjectProcess3> RoadProjectProcess3 { get; set; }
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