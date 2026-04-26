using BigDrops.Api.Commands.RevertInvoiceToQuotation;
using BigDrops.Api.Endpoints;
using BigDrops.Api.Infrastructure.Auth;
using BigDrops.Api.Infrastructure.Database;
using BigDrops.Api.Infrastructure.Time;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();

// TODO: Prepare Sentry integration
// builder.WebHost.UseSentry(o => {
//     o.Dsn = builder.Configuration["SENTRY_DSN"];
//     o.TracesSampleRate = 1.0;
// });

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.AddRateLimiter(options =>
{
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"error\": \"Too many requests. Please try again later.\"}", token);
    };

    var permitLimit = builder.Configuration.GetValue<int>("RATE_LIMIT_PER_MINUTE", 600);
    var queueLimit = builder.Configuration.GetValue<int>("RATE_LIMIT_QUEUE_LIMIT", 100);

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = permitLimit,
                QueueLimit = queueLimit,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                Window = TimeSpan.FromMinutes(1)
            }));
});

builder.Services.AddHttpClient<ISupabaseAuthService, SupabaseAuthService>(client => 
{
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
builder.Services.AddSingleton<ISystemClock, SystemClock>();
builder.Services.AddScoped<RevertInvoiceToQuotationHandler>();

var app = builder.Build();

app.UseResponseCompression();
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "healthy" })).DisableRateLimiting();

app.MapInvoicesEndpoints();

app.Run();
