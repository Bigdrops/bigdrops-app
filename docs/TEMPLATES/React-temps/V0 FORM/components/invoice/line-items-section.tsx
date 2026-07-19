'use client';

import React, { useState } from 'react';
import { ChevronDown, Plus, Trash2, Copy, GripVertical, FolderPlus } from 'lucide-react';
import { LineItem, Group, LineItemsProps } from '@/lib/invoice-types';
import { calculateLineItemTotal, formatCurrency } from '@/lib/invoice-utils';
import { designTokens } from '@/lib/invoice-design-tokens';

interface ExpandedItemId {
  itemId: string;
  groupId?: string;
}

export function LineItemsSection({
  items,
  groups,
  onItemChange,
  onAddItem,
  onAddGroup,
  onDeleteItem,
  onDuplicateItem,
  onImportItems,
  onTableSettings,
  onGroupCollapse,
}: LineItemsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleItemExpanded = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
  };

  const toggleGroupCollapsed = (groupId: string) => {
    const newSet = new Set(collapsedGroups);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setCollapsedGroups(newSet);
    onGroupCollapse?.(groupId);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
        style={{
          backgroundColor: designTokens.colors.paper,
          borderColor: designTokens.colors.hairline,
        }}>
        <button
          onClick={onAddItem}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: designTokens.colors.ink,
            color: designTokens.colors.surfaceAlt,
          }}
          title="Add Item"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Item</span>
        </button>
        <button
          onClick={onAddGroup}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: designTokens.colors.canvas,
            color: designTokens.colors.ink,
            border: `1px solid ${designTokens.colors.hairline}`,
          }}
          title="Add Group"
        >
          <FolderPlus size={16} />
          <span className="hidden sm:inline">Add Group</span>
        </button>
      </div>

      {/* Line Items List */}
      <div className="space-y-2">
        {groups.length === 0 && items.length === 0 ? (
          <div
            className="py-12 text-center rounded-xl border-2 border-dashed"
            style={{
              borderColor: designTokens.colors.hairline,
              backgroundColor: designTokens.colors.surfaceAlt,
            }}
          >
            <p
              style={{
                color: designTokens.colors.midGray,
                fontSize: designTokens.typography.sizes.body,
              }}
            >
              No line items yet
            </p>
            <p
              style={{
                color: designTokens.colors.midGray,
                fontSize: designTokens.typography.sizes.caption,
                marginTop: '4px',
              }}
            >
              Add your first item or import from a template
            </p>
          </div>
        ) : (
          <>
            {/* Ungrouped Items */}
            {items.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpand={() => toggleItemExpanded(item.id)}
                onItemChange={onItemChange}
                onDeleteItem={onDeleteItem}
                onDuplicateItem={onDuplicateItem}
              />
            ))}

            {/* Grouped Items */}
            {groups.map((group) => (
              <div key={group.id} className="space-y-1">
                {/* Group Header */}
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border"
                  style={{
                    backgroundColor: designTokens.colors.surfaceAlt,
                    borderColor: designTokens.colors.hairline,
                  }}
                >
                  <button
                    onClick={() => toggleGroupCollapsed(group.id)}
                    className="p-1 hover:opacity-70 transition-opacity"
                  >
                    <ChevronDown
                      size={16}
                      style={{
                        color: designTokens.colors.ink,
                        transform: collapsedGroups.has(group.id)
                          ? 'rotate(-90deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>
                  <span
                    className="font-medium flex-1"
                    style={{
                      color: designTokens.colors.ink,
                      fontSize: designTokens.typography.sizes.body,
                    }}
                  >
                    {group.name}
                  </span>
                  <span
                    style={{
                      color: designTokens.colors.midGray,
                      fontSize: designTokens.typography.sizes.caption,
                    }}
                  >
                    {formatCurrency(group.subtotal || 0)}
                  </span>
                </div>

                {/* Group Items */}
                {!collapsedGroups.has(group.id) && (
                  <div className="ml-4 space-y-1 border-l-2 border-dashed pl-4"
                    style={{ borderColor: designTokens.colors.hairline }}>
                    {group.items.map((item) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        isExpanded={expandedItems.has(item.id)}
                        onToggleExpand={() => toggleItemExpanded(item.id)}
                        onItemChange={onItemChange}
                        onDeleteItem={onDeleteItem}
                        onDuplicateItem={onDuplicateItem}
                        isGrouped
                      />
                    ))}
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors"
                      style={{
                        color: designTokens.colors.midGray,
                        backgroundColor: designTokens.colors.canvas,
                        border: `1px solid ${designTokens.colors.hairline}`,
                      }}
                      onClick={() => onAddItem?.()}
                    >
                      <Plus size={14} />
                      Add to group
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface LineItemRowProps {
  item: LineItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onItemChange?: (itemId: string, updates: Partial<LineItem>) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  isGrouped?: boolean;
}

function LineItemRow({
  item,
  isExpanded,
  onToggleExpand,
  onItemChange,
  onDeleteItem,
  onDuplicateItem,
  isGrouped,
}: LineItemRowProps) {
  const total = calculateLineItemTotal(item);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: designTokens.colors.paper,
        borderColor: designTokens.colors.hairline,
      }}
    >
      {/* Collapsed View */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onToggleExpand}
      >
        <GripVertical size={16} style={{ color: designTokens.colors.midGray }} />

        {/* Description & Quantity */}
        <div className="flex-1 min-w-0">
          <p
            className="font-medium truncate"
            style={{
              color: designTokens.colors.ink,
              fontSize: designTokens.typography.sizes.body,
            }}
          >
            {item.description}
          </p>
          {item.subDescription && (
            <p
              className="text-xs truncate"
              style={{
                color: designTokens.colors.midGray,
              }}
            >
              {item.subDescription}
            </p>
          )}
        </div>

        {/* Quantity & Rate (compact) */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p
              className="text-xs"
              style={{ color: designTokens.colors.midGray }}
            >
              {item.quantity}
            </p>
            <p
              className="font-medium"
              style={{
                color: designTokens.colors.ink,
                fontSize: designTokens.typography.sizes.caption,
              }}
            >
              {item.unit}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-xs"
              style={{ color: designTokens.colors.midGray }}
            >
              @ {formatCurrency(item.rate)}
            </p>
            <p
              className="font-semibold"
              style={{
                color: designTokens.colors.ink,
                fontSize: designTokens.typography.sizes.body,
              }}
            >
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          size={16}
          style={{
            color: designTokens.colors.midGray,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div
          className="px-4 py-3 border-t space-y-3"
          style={{ borderColor: designTokens.colors.hairline }}
        >
          {/* Primary Fields */}
          <div className="space-y-2">
            <div>
              <label
                className="text-xs font-medium block mb-1"
                style={{ color: designTokens.colors.midGray }}
              >
                Description
              </label>
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  onItemChange?.(item.id, { description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{
                  backgroundColor: designTokens.colors.surfaceAlt,
                  borderColor: designTokens.colors.hairline,
                  color: designTokens.colors.ink,
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  className="text-xs font-medium block mb-1"
                  style={{ color: designTokens.colors.midGray }}
                >
                  Qty
                </label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    onItemChange?.(item.id, {
                      quantity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{
                    backgroundColor: designTokens.colors.surfaceAlt,
                    borderColor: designTokens.colors.hairline,
                    color: designTokens.colors.ink,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium block mb-1"
                  style={{ color: designTokens.colors.midGray }}
                >
                  Unit
                </label>
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) =>
                    onItemChange?.(item.id, { unit: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{
                    backgroundColor: designTokens.colors.surfaceAlt,
                    borderColor: designTokens.colors.hairline,
                    color: designTokens.colors.ink,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium block mb-1"
                  style={{ color: designTokens.colors.midGray }}
                >
                  Rate
                </label>
                <input
                  type="number"
                  value={item.rate}
                  onChange={(e) =>
                    onItemChange?.(item.id, { rate: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{
                    backgroundColor: designTokens.colors.surfaceAlt,
                    borderColor: designTokens.colors.hairline,
                    color: designTokens.colors.ink,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Advanced Fields */}
          <div>
            <details className="group">
              <summary
                className="font-medium text-xs cursor-pointer px-2 py-1"
                style={{ color: designTokens.colors.midGray }}
              >
                Advanced Details
              </summary>
              <div className="space-y-2 mt-2">
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: designTokens.colors.midGray }}
                  >
                    Sub-Description
                  </label>
                  <input
                    type="text"
                    value={item.subDescription || ''}
                    onChange={(e) =>
                      onItemChange?.(item.id, {
                        subDescription: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm border"
                    style={{
                      backgroundColor: designTokens.colors.surfaceAlt,
                      borderColor: designTokens.colors.hairline,
                      color: designTokens.colors.ink,
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className="text-xs font-medium block mb-1"
                      style={{ color: designTokens.colors.midGray }}
                    >
                      Make
                    </label>
                    <input
                      type="text"
                      value={item.make || ''}
                      onChange={(e) =>
                        onItemChange?.(item.id, { make: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm border"
                      style={{
                        backgroundColor: designTokens.colors.surfaceAlt,
                        borderColor: designTokens.colors.hairline,
                        color: designTokens.colors.ink,
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs font-medium block mb-1"
                      style={{ color: designTokens.colors.midGray }}
                    >
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={item.partNumber || ''}
                      onChange={(e) =>
                        onItemChange?.(item.id, { partNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm border"
                      style={{
                        backgroundColor: designTokens.colors.surfaceAlt,
                        borderColor: designTokens.colors.hairline,
                        color: designTokens.colors.ink,
                      }}
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onDuplicateItem?.(item.id)}
              className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg font-medium transition-colors flex-1"
              style={{
                backgroundColor: designTokens.colors.canvas,
                color: designTokens.colors.ink,
                border: `1px solid ${designTokens.colors.hairline}`,
              }}
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              onClick={() => onDeleteItem?.(item.id)}
              className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg font-medium transition-colors flex-1"
              style={{
                backgroundColor: designTokens.colors.canvas,
                color: designTokens.colors.ember,
                border: `1px solid ${designTokens.colors.hairline}`,
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
