﻿using RMIS.Models.Auth;

namespace RMIS.Models.Account.Permissions
{
    public class PermissionManagerView
    {
        public string Name { get; set; }
        public List<Permission> Permissions { get; set; }
    }


    public class NewPermission
    {
        public string Name { get; set; }
    }
}
