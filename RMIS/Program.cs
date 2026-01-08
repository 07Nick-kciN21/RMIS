using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RMIS.Data;
using RMIS.Middleware;
using RMIS.ViewEngines;
using RMIS.Models.Auth;
using RMIS.Repositories;
using Serilog;
using Microsoft.AspNetCore.Identity.UI.Services;
using RMIS.Utils;


var builder = WebApplication.CreateBuilder(args);

// 圖形驗證用
// 加入 Session 支援
builder.Services.AddDistributedMemoryCache(); // 必須的
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(10); // Session 過期時間
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true; // GDPR 相關，確保 Cookie 總是可用
});
builder.Services.AddControllersWithViews();


// 設定log
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console(
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] UserId: {UserId} | IP: {IP} | Operation: {Operation} | Status: {Status} | Reason: {Reason}{NewLine}{Exception}"
        )
        .WriteTo.File(
            path: "C:/Users/KingSu/Documents/Logs/log-.log",
            rollingInterval: RollingInterval.Day,
            shared: true,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] UserId: {UserId} | IP: {IP} | Operation: {Operation} | Status: {Status} | Reason: {Reason}{NewLine}{Exception}"
        );
});


//  註冊 AuthDbContext
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AuthDbConnectionString")));

// 設定 Identity
builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
{
    // 設定密碼重設 Token 有效時間
    options.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultProvider;
    options.Tokens.EmailConfirmationTokenProvider = TokenOptions.DefaultProvider;

    // 設定 Token 有效期
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;

    // 設定 Token 壽命，例如 5分鐘
    options.Tokens.ProviderMap[TokenOptions.DefaultProvider] =
        new TokenProviderDescriptor(typeof(DataProtectorTokenProvider<IdentityUser>));

    //options.SignIn.RequireConfirmedAccount = true; 
})
.AddEntityFrameworkStores<AuthDbContext>() // ✅ 讓 `UserManager<ApplicationUser>` 和 `RoleManager<ApplicationRole>` 使用 `EF Core`
.AddDefaultTokenProviders();

// ✅ 設定 Token 有效時間，例如 5分鐘
builder.Services.Configure<DataProtectionTokenProviderOptions>(opt =>
    opt.TokenLifespan = TimeSpan.FromSeconds(300));

builder.Services.Configure<IdentityOptions>(options =>
{
    options.User.RequireUniqueEmail = true; // 要求信箱
    options.Password.RequireDigit = false; // 不要求數字
    options.Password.RequireLowercase = false; // 不要求小寫字母
    options.Password.RequireUppercase = false; // 不要求大寫字母
    options.Password.RequireNonAlphanumeric = false; // **不要求特殊字元**
    options.Password.RequiredLength = 6; // 最低密碼長度
    options.Password.RequiredUniqueChars = 0; // 不要求最少不同字元數
});

// 註冊 Controllers、ViewLocationExpander
builder.Services.AddControllersWithViews()
    .AddRazorOptions(options =>
    {
        options.ViewLocationExpanders.Add(new CustomViewLocationExpander());
    });

// 註冊 MapDBContext
builder.Services.AddDbContext<MapDBContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MapDbConnectionString")));

// 註冊 Repository
builder.Services.AddScoped<AdminInterface, AdminRepository>();
builder.Services.AddScoped<AccountInterface, AccountRepository>();
builder.Services.AddScoped<PortalInterface, PortalRepository>();
builder.Services.AddScoped<MapdataInterface, MapdataRepository>();

// ✅ 註冊 RoleManager<ApplicationRole>
builder.Services.AddScoped<RoleManager<ApplicationRole>>();
builder.Services.AddScoped<UserManager<ApplicationUser>>();

// 註冊 IEmailSender
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddTransient<IEmailSender, EmailSender>();

var app = builder.Build();

app.UseSession();
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
    var path = context.Request.Path.ToString().ToLower(); // 確保小寫比較
    if (!context.User.Identity.IsAuthenticated &&
        !path.StartsWith("/portal") &&
        !path.StartsWith("/api/test/") &&  // 確保匹配 /api/Test/ 及其子路徑
        !path.StartsWith("/css") &&
        !path.StartsWith("/js") &&
        !path.StartsWith("/images") &&
        !path.Equals("/favicon.ico"))
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

app.Run();