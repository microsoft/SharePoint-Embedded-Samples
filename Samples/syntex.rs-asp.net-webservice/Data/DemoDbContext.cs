using Microsoft.EntityFrameworkCore;
using SyntexRSDemo.Data.Entities;

namespace SyntexRSDemo.Data
{
    public class DemoDbContext : DbContext
    {
        public DemoDbContext(DbContextOptions<DemoDbContext> options) : base(options) { }

        public DbSet<TenantSite> TenantSites { get; set; }
    }
}
