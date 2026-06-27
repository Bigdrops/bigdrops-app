import { useCallback, useLayoutEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { normalizeQuantity } from "@/domain/invoice";
import type { InvoiceItem } from "@/domain/invoice";
import {
  makeEmptyGroup,
  makeEmptyItem,
} from "@/components/useInvoiceColumns.jsx";
import {
  normalizeQuotationGrouping,
  toGroupMetaMap,
  makeQuotationGroupId,
} from "./quotationFormUtils";
import type { QuotationGroupState } from "./quotationFormTypes";

export interface UseQuotationLineItemsOptions {
  items: InvoiceItem[];
  setItems: Dispatch<SetStateAction<InvoiceItem[]>>;
  groups: QuotationGroupState[];
  setGroups: Dispatch<SetStateAction<QuotationGroupState[]>>;
}

export interface UseQuotationLineItemsReturn {
  addQuotationItem: () => void;
  insertItemAfter: (index: number) => void;
  updateItem: (index: number, field: string, value: unknown) => void;
  applyRowPatch: (itemIndex: number, patch: Partial<InvoiceItem>) => void;
  resetItemOverrides: (fields: {
    vat?: boolean;
    discount?: boolean;
    install?: boolean;
  }) => void;
  removeItemAt: (itemIndex: number) => void;
  moveItemBy: (itemIndex: number, direction: number) => void;
  addQuotationGroup: () => void;
  updateGroupName: (groupId: string, newName: string) => void;
  toggleGroupSubtotal: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  addItemToGroup: (groupId: string) => void;
  commitGrouping: (
    nextItemsInput: InvoiceItem[] | ((current: InvoiceItem[]) => InvoiceItem[]),
    nextGroupsInput?:
      | QuotationGroupState[]
      | ((current: QuotationGroupState[]) => QuotationGroupState[]),
  ) => void;
}

export function useQuotationLineItems({
  items,
  setItems,
  groups,
  setGroups,
}: UseQuotationLineItemsOptions): UseQuotationLineItemsReturn {
  const itemsRef = useRef(items);
  const groupsRef = useRef(groups);

  const updateRefs = useCallback(() => {
    itemsRef.current = items;
    groupsRef.current = groups;
  }, [items, groups]);

  useLayoutEffect(() => {
    updateRefs();
  }, [items, groups, updateRefs]);

  const commitGrouping = useCallback(
    (
      nextItemsInput:
        | InvoiceItem[]
        | ((current: InvoiceItem[]) => InvoiceItem[]),
      nextGroupsInput?:
        | QuotationGroupState[]
        | ((current: QuotationGroupState[]) => QuotationGroupState[]),
    ) => {
      // Do NOT call updateRefs() here. updateRefs() closes over the items/groups from the
      // last render and would overwrite the ref with stale data, losing any changes already
      // written by a prior commitGrouping call in the same synchronous event (e.g. the two
      // onUpdate calls in handleDescriptionChange when item.item_id is set, or the three
      // onUpdate calls in handleSuggestionSelect). The useLayoutEffect below keeps the refs
      // fresh after every render; between consecutive synchronous calls the manually updated
      // refs (itemsRef.current = normalized.items below) carry the accumulated state forward.
      const baseItems = itemsRef.current;
      const baseGroups = groupsRef.current;
      const nextItems =
        typeof nextItemsInput === "function"
          ? nextItemsInput(baseItems)
          : nextItemsInput;
      const nextGroups =
        typeof nextGroupsInput === "function"
          ? nextGroupsInput(baseGroups)
          : (nextGroupsInput ?? baseGroups);

      const normalized = normalizeQuotationGrouping(
        nextItems,
        toGroupMetaMap(nextGroups),
      )

      itemsRef.current = normalized.items;
      groupsRef.current = normalized.groups;
      setItems(normalized.items);
      setGroups(normalized.groups);
    },
    // updateRefs is intentionally excluded – commitGrouping reads refs directly and the
    // useLayoutEffect below ensures refs are always current before the next interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setItems, setGroups],
  );

  const updateItem = useCallback(
    (index: number, field: string, value: unknown) => {
      const target = itemsRef.current[index]
      if (!target) return
      if (field === "custom_data") {
        const currentData = target.custom_data
        if (currentData === value || (currentData && value && JSON.stringify(currentData) === JSON.stringify(value))) return
      } else {
        const resolved = field === "quantity" ? normalizeQuantity(value, 1) : value
        if (target[field] === resolved) return
      }
      commitGrouping((current) =>
        current.map((item, itemIndex) => {
          if (itemIndex !== index) return item;
          if (field === "custom_data")
            return {
              ...item,
              custom_data: value as InvoiceItem["custom_data"],
            };
          return {
            ...item,
            [field]: field === "quantity" ? normalizeQuantity(value, 1) : value,
          };
        }),
      );
    },
    [commitGrouping],
  );

  const applyRowPatch = useCallback(
    (itemIndex: number, patch: Partial<InvoiceItem>) =>
      commitGrouping((current) =>
        current.map((item, index) =>
          index === itemIndex ? { ...item, ...patch } : item,
        ),
      ),
    [commitGrouping],
  );

  const resetItemOverrides = useCallback(
    (fields: { vat?: boolean; discount?: boolean; install?: boolean }) =>
      commitGrouping((current) =>
        current.map((item) => {
          if (item.row_type !== "standard") return item;
          const patch: Partial<InvoiceItem> = {};
          if (fields.vat) patch.vat_rate = null;
          if (fields.discount) patch.discount_rate = null;
          if (fields.install) {
            patch.install_rate = null;
            patch.install_rate_override = false;
          }
          return { ...item, ...patch };
        }),
      ),
    [commitGrouping],
  );

  const addUngroupedItem = useCallback(
    (
      insertAt: number | null = null,
      groupId: string | null = null,
      groupName = "",
    ) => {
      commitGrouping((current) => {
        const newItem: InvoiceItem = {
          ...makeEmptyItem(),
          row_type: "standard",
          group_id: groupId,
          group_name: groupName,
        };
        if (insertAt === null || insertAt >= current.length)
          return [...current, { ...newItem, sort_order: current.length }];
        const before = current.slice(0, insertAt);
        const inserted = { ...newItem, sort_order: insertAt };
        const after = current.slice(insertAt).map((item, i) => ({ ...item, sort_order: insertAt + 1 + i }));
        return [...before, inserted, ...after];
      });
    },
    [commitGrouping],
  );

  const addQuotationItem = useCallback(
    () => addUngroupedItem(),
    [addUngroupedItem],
  );

  const insertItemAfter = useCallback(
    (index: number) => {
      const item = itemsRef.current[index];
      addUngroupedItem(
        index + 1,
        item?.group_id || null,
        item?.group_name || "",
      );
    },
    [addUngroupedItem],
  );

  const addQuotationGroup = useCallback(() => {
    const base = makeEmptyGroup();
    const groupId = base.id || makeQuotationGroupId();
    const group = {
      ...base,
      id: groupId,
      name: base.name || `Group ${groupsRef.current.length + 1}`,
      showSubtotal: !!base.showSubtotal,
    };

    commitGrouping(
      (current) => {
        const groupHeader: InvoiceItem = {
          ...makeEmptyItem(),
          row_type: "group_header",
          group_id: group.id,
          group_name: group.name,
          description: "",
          sort_order: current.length,
        };

        return [...current, groupHeader];
      },
      (current) => [...current, group],
    );
  }, [commitGrouping]);

  const updateGroupName = useCallback(
    (groupId: string, newName: string) =>
      commitGrouping(
        (current) =>
          current.map((item) =>
            item.row_type === "group_header" && item.group_id === groupId
              ? { ...item, group_name: newName }
              : item,
          ),
        (current) =>
          current.map((group) =>
            group.id === groupId ? { ...group, name: newName } : group,
          ),
      ),
    [commitGrouping],
  );

  const toggleGroupSubtotal = useCallback(
    (groupId: string) =>
      commitGrouping(
        (current) => current,
        (current) =>
          current.map((group) =>
            group.id === groupId
              ? { ...group, showSubtotal: !group.showSubtotal }
              : group,
          ),
      ),
    [commitGrouping],
  );

  const deleteGroup = useCallback(
    (groupId: string) =>
      commitGrouping(
        (current) =>
          current
            .filter(
              (item) =>
                !(
                  item.row_type === "group_header" && item.group_id === groupId
                ),
            )
            .map((item, index) =>
              item.group_id === groupId
                ? { ...item, group_id: null, group_name: "", sort_order: index }
                : { ...item, sort_order: index },
            ),
        (current) => current.filter((group) => group.id !== groupId),
      ),
    [commitGrouping],
  );

  const addItemToGroup = useCallback(
    (groupId: string) => {
      const normalizedGrouping = normalizeQuotationGrouping(
        itemsRef.current,
        toGroupMetaMap(groupsRef.current),
      );
      const group = normalizedGrouping.groups.find(
        (entry) => entry.id === groupId,
      );
      if (!group) return;

      commitGrouping((current) => {
        let insertAt = current.findIndex(
          (item) =>
            item.row_type === "group_header" && item.group_id === groupId,
        );
        if (insertAt === -1) insertAt = current.length - 1;

        for (let index = insertAt + 1; index < current.length; index += 1) {
          if (current[index].row_type === "group_header") break;
          if (current[index].group_id === groupId) insertAt = index;
        }

        const next = [...current];
        next.splice(insertAt + 1, 0, {
          ...makeEmptyItem(),
          row_type: "standard",
          group_id: groupId,
          group_name: "",
        });
        return next.map((item, index) => ({ ...item, sort_order: index }));
      });
    },
    [commitGrouping],
  );

  const removeItemAt = useCallback(
    (itemIndex: number) =>
      commitGrouping((current) => {
        if (itemIndex < 0 || itemIndex >= current.length) return current
        const before = current.slice(0, itemIndex)
        const after = current.slice(itemIndex + 1).map((item, i) => ({ ...item, sort_order: before.length + i }))
        return [...before, ...after]
      }),
    [commitGrouping],
  );

  const moveItemBy = useCallback(
    (itemIndex: number, direction: number) => {
      commitGrouping((current) => {
        const snapshot = normalizeQuotationGrouping(
          current,
          toGroupMetaMap(groupsRef.current),
        );
        const rows = [...snapshot.items];
        const row = rows[itemIndex];
        if (!row) return rows;

        const getGroupBlockEnd = (startIndex: number) => {
          let endIndex = startIndex;
          for (let cursor = startIndex + 1; cursor < rows.length; cursor += 1) {
            if (rows[cursor].row_type === "group_header") break;
            if (rows[cursor].group_id === rows[startIndex].group_id)
              endIndex = cursor;
          }
          return endIndex;
        };

        if (row.row_type === "group_header") {
          const block = rows.slice(itemIndex, getGroupBlockEnd(itemIndex) + 1);
          const remainder = [
            ...rows.slice(0, itemIndex),
            ...rows.slice(itemIndex + block.length),
          ];
          let insertAt = itemIndex;

          if (direction < 0) {
            if (itemIndex === 0) return rows;
            for (let cursor = itemIndex - 1; cursor >= 0; cursor -= 1) {
              if (remainder[cursor].row_type === "group_header") {
                let prevEnd = cursor;
                for (let sub = cursor + 1; sub < remainder.length; sub += 1) {
                  if (remainder[sub].row_type === "group_header") break;
                  if (remainder[sub].group_id === remainder[cursor].group_id) prevEnd = sub;
                }
                insertAt = prevEnd + 1;
                break;
              }
            }
            if (insertAt === itemIndex) insertAt = 0;
          } else {
            for (let cursor = 0; cursor < remainder.length; cursor += 1) {
              if (remainder[cursor].row_type === "group_header" && cursor >= itemIndex) {
                let end = cursor;
                for (let sub = cursor + 1; sub < remainder.length; sub += 1) {
                  if (remainder[sub].row_type === "group_header") break;
                  if (remainder[sub].group_id === remainder[cursor].group_id) end = sub;
                }
                insertAt = end + 1;
                break;
              }
            }
            if (insertAt === itemIndex) insertAt = remainder.length;
          }

          remainder.splice(insertAt, 0, ...block);
          return remainder.map((entry, entryIndex) => ({
            ...entry,
            sort_order: entryIndex,
          }));
        }

        const nextIndex = itemIndex + direction;
        if (nextIndex < 0 || nextIndex >= rows.length) return rows;

        const moving = { ...row };
        const anchor = rows[nextIndex];
        if (!anchor) return rows;
        const remainder = rows.filter((_, index) => index !== itemIndex);

        if (direction < 0) {
          moving.group_id =
            anchor.row_type === "group_header"
              ? anchor.group_id || null
              : anchor.group_id || null;
          moving.group_name = "";
          remainder.splice(
            anchor.row_type === "group_header" ? nextIndex + 1 : nextIndex,
            0,
            moving,
          );
        } else {
          moving.group_id =
            anchor.row_type === "group_header" ? null : anchor.group_id || null;
          moving.group_name = "";
          remainder.splice(nextIndex, 0, moving);
        }

        return remainder.map((entry, entryIndex) => ({
          ...entry,
          sort_order: entryIndex,
        }));
      });
    },
    [commitGrouping],
  );

  return {
    addQuotationItem,
    insertItemAfter,
    updateItem,
    applyRowPatch,
    resetItemOverrides,
    removeItemAt,
    moveItemBy,
    addQuotationGroup,
    updateGroupName,
    toggleGroupSubtotal,
    deleteGroup,
    addItemToGroup,
    commitGrouping,
  };
}
