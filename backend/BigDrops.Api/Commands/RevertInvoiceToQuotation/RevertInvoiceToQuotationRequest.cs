namespace BigDrops.Api.Commands.RevertInvoiceToQuotation;

public sealed class RevertInvoiceToQuotationRequest
{
  public string? Reason { get; set; }
  public string? ConfirmedInvoiceNumber { get; set; }
}
