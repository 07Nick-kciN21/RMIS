using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RMIS.Data;
using RMIS.Middleware;
using RMIS.Repositories;
using Serilog;
using Serilog.Expressions;
using Serilog.Sinks.Map;
using System.IO;


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
                
                var homePath = Environment.GetEnvironmentVariable("USERPROFILE").Replace("\\", "/");
                if (string.IsNullOrEmpty(homePath))
                {
                    throw new InvalidOperationException("環境變數 'HOMEPATH' 無法解析");
                }
                var logPath = $"{homePath}/Documents/Logs/{controller}log-.log";
                wt.File(
                    logPath,
                    rollingInterval: RollingInterval.Day
                ); // 根據 Controller與日期分檔
            }
        );
});


// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<MapDBContext>(options =>
options.UseSqlServer(builder.Configuration.GetConnectionString("MapDbConnectionString")));

builder.Services.AddScoped<AdminInterface, AdminRepository>();
var app = builder.Build();

app.UseMiddleware<LoggingMiddleware>();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
