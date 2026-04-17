using Microsoft.EntityFrameworkCore;
using Demo.Data.Entities;

namespace Demo.Data
{
    public class DemoDbContext : DbContext
    {
        public DemoDbContext(DbContextOptions<DemoDbContext> options) : base(options) { }

        public DbSet<TenantSite> TenantSites { get; set; }
    }
}
