alter table public.quotations
add column if not exists po_number text;

comment on column public.quotations.po_number is 'Optional purchase order number associated with the quotation.';

the wor is done 