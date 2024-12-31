using Microsoft.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RMIS.Models.sql;

namespace RMIS.Data
{
    public class MapDBContext:DbContext
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
        }
    }
}
