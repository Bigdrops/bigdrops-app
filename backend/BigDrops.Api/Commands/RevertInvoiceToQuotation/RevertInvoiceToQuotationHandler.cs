using System.Text.Json;
using Dapper;
using BigDrops.Api.Infrastructure.Database;
using BigDrops.Api.Infrastructure.Time;

namespace BigDrops.Api.Commands.RevertInvoiceToQuotation;

public sealed class RevertInvoiceToQuotationHandler
{
  private readonly IDbConnectionFactory _connectionFactory;
  private readonly ISystemClock _clock;

  public RevertInvoiceToQuotationHandler(IDbConnectionFactory connectionFactory, ISystemClock clock)
  {
    _connectionFactory = connectionFactory;
    _clock = clock;
  }

  public async Task<RevertInvoiceToQuotationResponse> HandleAsync(
    string invoiceId,
    RevertInvoiceToQuotationRequest request,
    CancellationToken cancellationToken)
  {
    await using var connection = _connectionFactory.CreateConnection();
    await connection.OpenAsync(cancellationToken);

    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

    var invoice = await connection.QuerySingleOrDefaultAsync<InvoiceRow>(
      new CommandDefinition(
        "select * from invoices where id = @invoiceId for update",
        new { invoiceId },
        transaction: transaction,
        cancellationToken: cancellationToken
      )
    );

    if (invoice is null)
    {
      throw new RevertInvoiceToQuotationNotFoundException();
    }

    if (!string.IsNullOrWhiteSpace(request.ConfirmedInvoiceNumber)
        && !string.Equals(request.ConfirmedInvoiceNumber, invoice.invoice_number, StringComparison.OrdinalIgnoreCase))
    {
      throw new RevertInvoiceToQuotationValidationException("Invoice number confirmation does not match.");
    }

    var quotationNumbers = await connection.QueryAsync<string>(
      new CommandDefinition(
        "select quotation_number from quotations",
        transaction: transaction,
        cancellationToken: cancellationToken
      )
    );

    var nextQuotationNumber = GetNextQuotationNumber(quotationNumbers);

    var customFields = ParseCustomFields(invoice.custom_fields);
    var sourceLink = new Dictionary<string, object?>
    {
      ["id"] = invoice.id,
      ["type"] = "invoice",
      ["number"] = invoice.invoice_number ?? string.Empty,
      ["project_id"] = invoice.project_id,
      ["po_number"] = string.IsNullOrWhiteSpace(invoice.po_number) ? null : invoice.po_number,
      ["created_at"] = _clock.UtcNow.ToString("O"),
    };

    var conversionTrail = ExtractConversionTrail(customFields);
    conversionTrail["source"] = sourceLink;
    if (!conversionTrail.ContainsKey("derived"))
    {
      conversionTrail["derived"] = new List<object>();
    }
    customFields["conversionTrail"] = conversionTrail;
    customFields["quotationTitle"] = invoice.invoice_title ?? string.Empty;
    customFields["clientName"] = invoice.client_name ?? string.Empty;
    customFields["notesHtml"] = invoice.notes ?? string.Empty;
    customFields["termsHtml"] = invoice.terms ?? string.Empty;

    var quotationPayload = new
    {
      quotation_number = nextQuotationNumber,
      po_number = string.IsNullOrWhiteSpace(invoice.po_number) ? null : invoice.po_number,
      quotation_title = invoice.invoice_title,
      client_id = invoice.client_id,
      client_name = invoice.client_name ?? string.Empty,
      project_id = invoice.project_id,
      issue_date = invoice.issue_date ?? _clock.UtcNow.ToString("yyyy-MM-dd"),
      valid_until = invoice.due_date,
      status = "draft",
      notes = invoice.notes ?? string.Empty,
      terms = invoice.terms ?? string.Empty,
      workmanship = invoice.workmanship ?? 0,
      transportation = invoice.transportation ?? 0,
      shipping = invoice.shipping ?? 0,
      discount = invoice.discount ?? 0,
      vat = invoice.vat ?? 0,
      wht = invoice.wht ?? 0,
      subtotal = invoice.subtotal ?? 0,
      install_rate_total = invoice.install_rate_total ?? 0,
      total = invoice.total ?? 0,
      amount_in_words = invoice.amount_in_words ?? string.Empty,
      custom_fields = JsonSerializer.Serialize(customFields),
    };

    var createdQuotation = await connection.QuerySingleAsync<QuotationRow>(
      new CommandDefinition(
        """
        insert into quotations (
          quotation_number, po_number, quotation_title, client_id, client_name, project_id,
          issue_date, valid_until, status, notes, terms, workmanship, transportation,
          shipping, discount, vat, wht, subtotal, install_rate_total, total, amount_in_words, custom_fields
        )
        values (
          @quotation_number, @po_number, @quotation_title, @client_id, @client_name, @project_id,
          @issue_date, @valid_until, @status, @notes, @terms, @workmanship, @transportation,
          @shipping, @discount, @vat, @wht, @subtotal, @install_rate_total, @total, @amount_in_words, @custom_fields
        )
        returning id, quotation_number
        """,
        quotationPayload,
        transaction: transaction,
        cancellationToken: cancellationToken
      )
    );

    var insertedItems = await connection.ExecuteAsync(
      new CommandDefinition(
        """
        insert into quotation_items (
          quotation_id, description, sub_description, make, quantity, unit,
          unit_price, amount, custom_data, install_rate, install_rate_override,
          vat_rate, discount_rate, row_type, group_name, sort_order, image_url
        )
        select
          @quotationId, description, sub_description, make, quantity, unit,
          unit_price, amount, custom_data, install_rate, install_rate_override,
          vat_rate, discount_rate, row_type, group_name, sort_order, image_url
        from invoice_items
        where invoice_id = @invoiceId
        """,
        new { quotationId = createdQuotation.id, invoiceId },
        transaction: transaction,
        cancellationToken: cancellationToken
      )
    );

    var deletedPayments = await connection.ExecuteAsync(
      new CommandDefinition(
        "delete from payments where invoice_id = @invoiceId",
        new { invoiceId },
        transaction: transaction,
        cancellationToken: cancellationToken
      )
    );

    var deletedInvoiceItems = await connection.ExecuteAsync(
      new CommandDefinition(
        "delete from invoice_items where invoice_id = @invoiceId",
        new { invoiceId },
        transaction: transaction,
        cancellationToken: cancellationToken
      )
    );

    await connection.ExecuteAsync(
      new CommandDefinition(
        "delete from invoices where id = @invoiceId",
        new { invoiceId },
        transaction: transaction,
        cancellationToken: cancellationToken
      )
    );

    await transaction.CommitAsync(cancellationToken);

    return new RevertInvoiceToQuotationResponse
    {
      InvoiceId = invoiceId,
      QuotationId = createdQuotation.id,
      QuotationNumber = createdQuotation.quotation_number,
      DeletedPayments = deletedPayments,
      DeletedInvoiceItems = deletedInvoiceItems,
    };
  }

  private static string GetNextQuotationNumber(IEnumerable<string> numbers, string prefix = "SASIQUO")
  {
    var max = 0;
    foreach (var value in numbers)
    {
      var normalized = (value ?? string.Empty).Trim().ToUpperInvariant();
      if (!normalized.StartsWith($"{prefix}-", StringComparison.OrdinalIgnoreCase)) continue;
      var parts = normalized.Split('-');
      if (parts.Length == 0) continue;
      if (int.TryParse(parts[^1], out var parsed))
      {
        max = Math.Max(max, parsed);
      }
    }
    return $"{prefix}-{(max + 1).ToString().PadLeft(3, '0')}";
  }

  private static Dictionary<string, object?> ParseCustomFields(string? raw)
  {
    if (string.IsNullOrWhiteSpace(raw)) return new Dictionary<string, object?>();
    try
    {
      var parsed = JsonSerializer.Deserialize<Dictionary<string, object?>>(raw);
      return parsed ?? new Dictionary<string, object?>();
    }
    catch
    {
      return new Dictionary<string, object?>();
    }
  }

  private static Dictionary<string, object?> ExtractConversionTrail(Dictionary<string, object?> customFields)
  {
    if (!customFields.TryGetValue("conversionTrail", out var trail) || trail is null)
    {
      return new Dictionary<string, object?>();
    }

    if (trail is Dictionary<string, object?> dict)
    {
      return new Dictionary<string, object?>(dict);
    }

    if (trail is JsonElement element && element.ValueKind == JsonValueKind.Object)
    {
      var parsed = JsonSerializer.Deserialize<Dictionary<string, object?>>(element.GetRawText());
      return parsed ?? new Dictionary<string, object?>();
    }

    return new Dictionary<string, object?>();
  }

  private sealed record InvoiceRow
  {
    public string id { get; init; } = string.Empty;
    public string? invoice_number { get; init; }
    public string? client_id { get; init; }
    public string? client_name { get; init; }
    public string? project_id { get; init; }
    public string? issue_date { get; init; }
    public string? due_date { get; init; }
    public string? notes { get; init; }
    public string? terms { get; init; }
    public string? po_number { get; init; }
    public string? invoice_title { get; init; }
    public decimal? workmanship { get; init; }
    public decimal? transportation { get; init; }
    public decimal? shipping { get; init; }
    public decimal? discount { get; init; }
    public decimal? vat { get; init; }
    public decimal? wht { get; init; }
    public decimal? subtotal { get; init; }
    public decimal? install_rate_total { get; init; }
    public decimal? total { get; init; }
    public string? amount_in_words { get; init; }
    public string? custom_fields { get; init; }
  }

  private sealed record QuotationRow
  {
    public string id { get; init; } = string.Empty;
    public string quotation_number { get; init; } = string.Empty;
  }
}

public sealed class RevertInvoiceToQuotationNotFoundException : Exception { }
public sealed class RevertInvoiceToQuotationValidationException : Exception
{
  public RevertInvoiceToQuotationValidationException(string message) : base(message) { }
}
