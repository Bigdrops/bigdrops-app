import { useCallback, useMemo, useState } from 'react'

export interface DocumentUIState {
  activeSheet: string | null
  activeModal: string | null
}

export function useDocumentUIState(initialState?: Partial<DocumentUIState>) {
  const [activeSheet, setActiveSheet] = useState<string | null>(
    initialState?.activeSheet ?? null,
  )
  const [activeModal, setActiveModal] = useState<string | null>(
    initialState?.activeModal ?? null,
  )

  const openSheet = useCallback((sheetId: string) => {
    setActiveSheet(sheetId)
  }, [])

  const closeSheet = useCallback(() => {
    setActiveSheet(null)
  }, [])

  const openModal = useCallback((modalId: string) => {
    setActiveModal(modalId)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  const closeAll = useCallback(() => {
    setActiveSheet(null)
    setActiveModal(null)
  }, [])

  return useMemo(
    () => ({
      activeSheet,
      activeModal,
      openSheet,
      closeSheet,
      openModal,
      closeModal,
      closeAll,
      isSheetOpen: (sheetId: string) => activeSheet === sheetId,
      isModalOpen: (modalId: string) => activeModal === modalId,
    }),
    [activeModal, activeSheet, closeAll, closeModal, closeSheet, openModal, openSheet],
  )
}
