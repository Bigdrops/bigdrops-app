using BigDrops.Api.Commands.RevertInvoiceToQuotation;
using BigDrops.Api.Infrastructure.Auth;

namespace BigDrops.Api.Endpoints;

public static class InvoicesEndpoints
{
  public static IEndpointRouteBuilder MapInvoicesEndpoints(this IEndpointRouteBuilder app)
  {
    var group = app.MapGroup("/api/invoices");

    group.MapPost("/{invoiceId}/revert-to-quotation", async (
        string invoiceId,
        RevertInvoiceToQuotationRequest request,
        HttpContext httpContext,
        ISupabaseAuthService authService,
        RevertInvoiceToQuotationHandler handler,
        CancellationToken cancellationToken
      ) =>
      {
        var bearer = httpContext.Request.Headers.Authorization.ToString();
        var token = bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
          ? bearer["Bearer ".Length..].Trim()
          : null;

        var user = await authService.ValidateAccessTokenAsync(token, cancellationToken);
        if (user?.Id is null)
        {
          return Results.Unauthorized();
        }

        var validation = RevertInvoiceToQuotationValidator.Validate(invoiceId, request);
        if (!validation.IsValid)
        {
          return Results.BadRequest(new { error = validation.Error });
        }

        try
        {
          var result = await handler.HandleAsync(invoiceId, request, cancellationToken);
          return Results.Ok(result);
        }
        catch (RevertInvoiceToQuotationNotFoundException)
        {
          return Results.NotFound();
        }
        catch (RevertInvoiceToQuotationValidationException ex)
        {
          return Results.BadRequest(new { error = ex.Message });
        }
      });

    return app;
  }
}
