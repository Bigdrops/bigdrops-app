import type { ColumnConfig } from '@/domain/invoice'

import type {
  CustomColumnDecision,
  ResolvedImportData,
  ResolvedImportItem,
  UnknownColumnCandidate,
  ValidatedImportData,
} from './types'
import { MAX_NEW_COLUMNS, buildColumnAliases, makeCustomColumn, toSnakeCase } from './utils'

function getExistingCustomColumnMap(columns: ColumnConfig[]) {
  return new Map(columns.filter((column) => column.key.startsWith('custom_')).map((column) => [column.key, column]))
}

export function getUnknownColumnCandidates(
  validated: ValidatedImportData,
  existingColumns: ColumnConfig[],
): UnknownColumnCandidate[] {
  const aliases = buildColumnAliases(existingColumns.filter((column) => column.key.startsWith('custom_')))
  return validated.unknownCandidates.filter((candidate) => !aliases.has(toSnakeCase(candidate.key)))
}

export function resolveImportColumns({
  validated,
  existingColumns,
  decisions,
}: {
  validated: ValidatedImportData
  existingColumns: ColumnConfig[]
  decisions: Record<string, CustomColumnDecision>
}): { ok: true; data: ResolvedImportData } | { ok: false; message: string } {
  const aliases = buildColumnAliases(existingColumns.filter((column) => column.key.startsWith('custom_')))
  const nextColumns = existingColumns.map((column) => ({ ...column }))
  const existingCustomColumns = getExistingCustomColumnMap(nextColumns)
  const createdColumns: ColumnConfig[] = []
  const resolvedItems: ResolvedImportItem[] = validated.items.map((item) => ({
    sourceIndex: item.sourceIndex,
    row_number: item.row_number,
    baseFields: {
      description: item.baseFields.description,
      sub_description: item.baseFields.sub_description,
      quantity: item.baseFields.quantity,
      unit: item.baseFields.unit,
      unit_price: item.baseFields.unit_price,
      make: item.baseFields.make,
      temp_ref: item.baseFields.temp_ref,
      group_id: item.baseFields.group_id,
    },
    customFields: {},
  }))

  for (const candidate of validated.unknownCandidates) {
    const aliasMatch = aliases.get(toSnakeCase(candidate.key))
    let columnKey: string | null = null

    if (aliasMatch) {
      columnKey = aliasMatch.key
    } else {
      const decision = decisions[candidate.key]
      if (!decision) {
        return {
          ok: false,
          message: `Choose how to handle "${candidate.sourceLabels[0] || candidate.key}".`,
        }
      }

      if (decision.action === 'drop') {
        columnKey = null
      } else if (decision.action === 'map') {
        const targetColumn = existingCustomColumns.get(decision.columnKey)
        if (!targetColumn) {
          return {
            ok: false,
            message: `Mapped column for "${candidate.sourceLabels[0] || candidate.key}" is not available.`,
          }
        }
        columnKey = targetColumn.key
      } else {
        if (createdColumns.length >= MAX_NEW_COLUMNS) {
          return {
            ok: false,
            message: `You can create up to ${MAX_NEW_COLUMNS} new columns per import.`,
          }
        }

        const column = makeCustomColumn(
          decision.label || candidate.sourceLabels[0] || candidate.key,
          nextColumns,
          candidate.inferredType,
        )
        nextColumns.push(column)
        createdColumns.push(column)
        existingCustomColumns.set(column.key, column)
        aliases.set(toSnakeCase(column.key), column)
        aliases.set(toSnakeCase(column.label), column)
        columnKey = column.key
      }
    }

    if (!columnKey) continue

    validated.items.forEach((item, index) => {
      if (Object.prototype.hasOwnProperty.call(item.extraFields, candidate.key)) {
        resolvedItems[index].customFields[columnKey as string] = item.extraFields[candidate.key]
      }
    })
  }

  return {
    ok: true,
    data: {
      topLevel: validated.topLevel,
      items: resolvedItems,
      columns: nextColumns,
      createdColumns,
      groups: (validated as any).groups || [],
    },
  }
}
