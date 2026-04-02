namespace BigDrops.Api.Commands.RevertInvoiceToQuotation;

public sealed record ValidationResult(bool IsValid, string? Error)
{
  public static ValidationResult Ok() => new(true, null);
  public static ValidationResult Fail(string error) => new(false, error);
}

public static class RevertInvoiceToQuotationValidator
{
  public static ValidationResult Validate(string invoiceId, RevertInvoiceToQuotationRequest request)
  {
    if (string.IsNullOrWhiteSpace(invoiceId))
    {
      return ValidationResult.Fail("Invoice id is required.");
    }

    if (request.Reason != null && request.Reason.Length > 500)
    {
      return ValidationResult.Fail("Reason is too long.");
    }

    return ValidationResult.Ok();
  }
}
