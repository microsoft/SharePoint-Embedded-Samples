using System;

namespace Demo.Data.Entities
{
    public class TenantSite
    {
        public Guid Id { get; set; }

        public Guid TenantId { get; set; }
        public string Name { get; set; }
        public Uri Url { get; set; }
    }
}
