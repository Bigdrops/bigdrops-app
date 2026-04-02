using BigDrops.Api.Commands.RevertInvoiceToQuotation;
using BigDrops.Api.Endpoints;
using BigDrops.Api.Infrastructure.Auth;
using BigDrops.Api.Infrastructure.Database;
using BigDrops.Api.Infrastructure.Time;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();

builder.Services.AddHttpClient();
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
builder.Services.AddSingleton<ISupabaseAuthService, SupabaseAuthService>();
builder.Services.AddSingleton<ISystemClock, SystemClock>();
builder.Services.AddScoped<RevertInvoiceToQuotationHandler>();

var app = builder.Build();

app.MapInvoicesEndpoints();

app.Run();
