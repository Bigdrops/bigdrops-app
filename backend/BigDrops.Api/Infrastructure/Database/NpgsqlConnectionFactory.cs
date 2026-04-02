using System.Data;
using Npgsql;

namespace BigDrops.Api.Infrastructure.Database;

public interface IDbConnectionFactory
{
  IDbConnection CreateConnection();
}

public sealed class NpgsqlConnectionFactory : IDbConnectionFactory
{
  private readonly IConfiguration _configuration;

  public NpgsqlConnectionFactory(IConfiguration configuration)
  {
    _configuration = configuration;
  }

  public IDbConnection CreateConnection()
  {
    var connectionString =
      _configuration.GetConnectionString("Default")
      ?? _configuration["DATABASE_URL"]
      ?? _configuration["ConnectionStrings__Default"];

    if (string.IsNullOrWhiteSpace(connectionString))
    {
      throw new InvalidOperationException("Database connection string not configured. Set ConnectionStrings:Default or DATABASE_URL.");
    }

    return new NpgsqlConnection(connectionString);
  }
}
