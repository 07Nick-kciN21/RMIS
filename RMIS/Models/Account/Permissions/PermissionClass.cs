using RMIS.Models.Auth;

namespace RMIS.Models.Account.Permissions
{
    public class PermissionManager
    {
        public List<PermissionData> Permissions { get; set; }
    }
    public class PermissionData
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; }
    }

    public class UpdatePermissionView
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool Status { get; set; }
    }

    public class NewPermission
    {
        public string Name { get; set; }
    }

    public class CreatePermissionView
    {
        public string Name { get; set; }
        public bool Status { get; set; }
    }
}
