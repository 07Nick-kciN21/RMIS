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
builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = true; 
})
.AddEntityFrameworkStores<AuthDbContext>() // ✅ 讓 `UserManager<ApplicationUser>` 和 `RoleManager<ApplicationRole>` 使用 `EF Core`
.AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = false; // 不要求數字
    options.Password.RequireLowercase = false; // 不要求小寫字母
    options.Password.RequireUppercase = false; // 不要求大寫字母
    options.Password.RequireNonAlphanumeric = false; // **不要求特殊字元**
    options.Password.RequiredLength = 6; // 最低密碼長度
    options.Password.RequiredUniqueChars = 0; // 不要求最少不同字元數
});

// 註冊 Controllers
builder.Services.AddControllersWithViews();

// 註冊 MapDBContext
builder.Services.AddDbContext<MapDBContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MapDbConnectionString")));

// 註冊 Repository
builder.Services.AddScoped<AdminInterface, AdminRepository>();
builder.Services.AddScoped<AccountInterface, AccountRepository>();

// ✅ 註冊 RoleManager<ApplicationRole>
builder.Services.AddScoped<RoleManager<ApplicationRole>>();
builder.Services.AddScoped<UserManager<ApplicationUser>>();

var app = builder.Build();


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
        !context.Request.Path.StartsWithSegments("/Portal/Login") &&
        !context.Request.Path.StartsWithSegments("/Portal/Register") &&
        !context.Request.Path.StartsWithSegments("/css") &&
        !context.Request.Path.StartsWithSegments("/js") &&
        !context.Request.Path.StartsWithSegments("/images") &&
        !context.Request.Path.StartsWithSegments("/favicon.ico"))
    {
        context.Response.Redirect("/Portal/Login");
        return;
    }

    await next();
});


// ✅ 設定路由與預設頁面
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Portal}/{action=Login}/{id?}"
);


//app.UseEndpoints(endpoints =>
//{
//    endpoints.MapControllerRoute(
//        name: "root",
//        pattern: "/",
//        defaults: new { controller = "Account", action = "Login" });

//    endpoints.MapControllerRoute(
//        name: "default",
//        pattern: "{controller=Account}/{action=Login}/{id?}");
//});

app.Run();