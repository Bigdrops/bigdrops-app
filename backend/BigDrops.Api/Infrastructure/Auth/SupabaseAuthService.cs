using System.Net.Http.Headers;
using System.Text.Json;

namespace BigDrops.Api.Infrastructure.Auth;

public interface ISupabaseAuthService
{
  Task<SupabaseUser?> ValidateAccessTokenAsync(string? accessToken, CancellationToken cancellationToken);
}

public sealed class SupabaseAuthService : ISupabaseAuthService
{
  private readonly HttpClient _httpClient;
  private readonly string _supabaseUrl;
  private readonly string _supabaseKey;

  public SupabaseAuthService(HttpClient httpClient, IConfiguration configuration)
  {
    _httpClient = httpClient;
    _supabaseUrl = configuration["SUPABASE_URL"] ?? configuration["Supabase__Url"] ?? string.Empty;
    _supabaseKey = configuration["SUPABASE_SERVICE_ROLE_KEY"]
      ?? configuration["SUPABASE_ANON_KEY"]
      ?? configuration["Supabase__AnonKey"]
      ?? string.Empty;
  }

  public async Task<SupabaseUser?> ValidateAccessTokenAsync(string? accessToken, CancellationToken cancellationToken)
  {
    if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(_supabaseUrl) || string.IsNullOrWhiteSpace(_supabaseKey))
    {
      return null;
    }

    var request = new HttpRequestMessage(HttpMethod.Get, $"{_supabaseUrl.TrimEnd('/')}/auth/v1/user");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
    request.Headers.Add("apikey", _supabaseKey);

    var response = await _httpClient.SendAsync(request, cancellationToken);
    if (!response.IsSuccessStatusCode)
    {
      return null;
    }

    var content = await response.Content.ReadAsStringAsync(cancellationToken);
    return JsonSerializer.Deserialize<SupabaseUser>(content, new JsonSerializerOptions
    {
      PropertyNameCaseInsensitive = true,
    });
  }
}

public sealed class SupabaseUser
{
  public string? Id { get; set; }
  public string? Email { get; set; }
}
