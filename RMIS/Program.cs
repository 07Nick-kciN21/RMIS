using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RMIS.Data;
using RMIS.Middleware;
using RMIS.Models.Auth;
using RMIS.Repositories;
using Serilog;
using Serilog.Expressions;
using Serilog.Sinks.Map;
using System.IO;
using RMIS.Controllers;

var builder = WebApplication.CreateBuilder(args);



builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration) // 从 appsettings.json 讀取配置
        .Enrich.FromLogContext() // 添加上下文
        .WriteTo.Console() // 控制台输出
        .WriteTo.Map(
            keySelector: logEvent => logEvent.Properties.ContainsKey("Controller")
                ? logEvent.Properties["Controller"].ToString().Trim('"') // 提取 Controller 名稱
                : "Default", // 如果沒有 Controller，存入 Default 檔案
            configure: (controller, wt) =>
            {

                var homePath = Environment.GetEnvironmentVariable("USERPROFILE").Replace("//", "/");
                if (string.IsNullOrEmpty(homePath))
                {
                    throw new InvalidOperationException("環境變數 'HOMEPATH' 無法解析");
                }
                var logPath = $"{homePath}/Documents/Logs/{controller}-.log";
                wt.File(
                    logPath,
                    rollingInterval: RollingInterval.Day
                ); // 根據 Controller與日期分檔
            }
        );
});

//  註冊 AuthDbContext
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AuthDbConnectionString")));

// 設定 Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = true;
})
.AddEntityFrameworkStores<AuthDbContext>()
.AddDefaultTokenProviders();

// 註冊 Controllers
builder.Services.AddControllersWithViews();

// 註冊 MapDBContext
builder.Services.AddDbContext<MapDBContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MapDbConnectionString")));

// 註冊 Repository
builder.Services.AddScoped<AdminInterface, AdminRepository>();

var app = builder.Build();

// ✅ 執行 Seeders
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var _authDbContext = services.GetRequiredService<AuthDbContext>();
    var _userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var _roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

    try
    {
        RoleSeeder.InitializeRoles(services).GetAwaiter().GetResult();
        PermissionSeeder.SeedPermissions(_authDbContext).GetAwaiter().GetResult();
        PermissionSeeder.SeedAdminUser(_authDbContext, _userManager).GetAwaiter().GetResult();
        PermissionSeeder.SeedRolePermissions(_authDbContext, _roleManager).GetAwaiter().GetResult();
        Console.WriteLine("Seeder 執行完成");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[錯誤] 權限初始化失敗: {ex.Message}");
    }
}

// ✅ 正確的 Middleware 執行順序
app.UseRouting(); // 🔹 必須先執行 Routing

app.UseAuthentication(); // ✅ 確保認證 Middleware 在 Authorization 之前
app.UseAuthorization();

app.UseMiddleware<LoggingMiddleware>(); // ✅ 確保日誌記錄中間件啟動

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

// ✅ 設定靜態檔案
app.UseStaticFiles(); // 允許讀取 wwwroot 內的靜態文件

// ✅ 設定自訂靜態檔案目錄
var staticFilePaths = new Dictionary<string, string>
{
    { "/roadProject", @"C:/Users/KingSu/Pictures/RMIS_IMG/roadProject" },
    { "/constructNotice", @"C:/Users/KingSu/Pictures/RMIS_IMG/constructNotice" }
};

foreach (var path in staticFilePaths)
{
    if (Directory.Exists(path.Value)) // ✅ 檢查目錄是否存在
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(path.Value),
            RequestPath = path.Key
        });
    }
    else
    {
        Console.WriteLine($"靜態檔案目錄不存在: {path.Value}");
    }
}

app.Use(async (context, next) =>
{
    if (!context.User.Identity.IsAuthenticated &&
        !context.Request.Path.StartsWithSegments("/Account/Login") &&
        !context.Request.Path.StartsWithSegments("/Account/Register") &&
        !context.Request.Path.StartsWithSegments("/css") &&
        !context.Request.Path.StartsWithSegments("/js") &&
        !context.Request.Path.StartsWithSegments("/images") &&
        !context.Request.Path.StartsWithSegments("/favicon.ico"))
    {
        context.Response.Redirect("/Account/Login");
        return;
    }

    await next();
});

// ✅ 設定路由與預設頁面
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute(
        name: "default",
        pattern: "{controller=Account}/{action=Login}/{id?}");
});

app.Run();