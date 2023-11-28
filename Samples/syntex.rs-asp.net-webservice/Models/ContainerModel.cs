namespace SyntexRSDemo.Models
{
    public class ContainerModel
    {
        // Please note that the fields start with lowercase. 
        // That's the way the API requires them
        public string id { get; set; }
        public string displayName { get; set; }
        public string description { get; set; }
        public string containerTypeId { get; set; }
        public string createdDateTime { get; set; }
        public string status { get; set; }

        public ContainerModel(string id = null, string displayName = null, string description = null, string containerTypeId = null, string status = null)
        {
            this.id = id;
            this.displayName = displayName;
            this.description = description;
            this.containerTypeId = containerTypeId;
            this.status = status;
        }
    }
}
