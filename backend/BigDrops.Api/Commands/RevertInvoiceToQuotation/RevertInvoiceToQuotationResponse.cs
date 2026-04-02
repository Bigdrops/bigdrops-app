namespace BigDrops.Api.Commands.RevertInvoiceToQuotation;

public sealed class RevertInvoiceToQuotationResponse
{
  public required string InvoiceId { get; init; }
  public required string QuotationId { get; init; }
  public required string QuotationNumber { get; init; }
  public int DeletedPayments { get; init; }
  public int DeletedInvoiceItems { get; init; }
}
