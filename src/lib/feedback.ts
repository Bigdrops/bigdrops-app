import { toast } from 'sonner'

export const feedback = {
  success: (message: string) => {
    toast.success(message, {
      duration: 2000,
      id: `success-${message.replace(/\s+/g, '-').toLowerCase()}`,
    })
  },
  error: (message: string | Error) => {
    const errorMsg = message instanceof Error ? message.message : message
    toast.error(errorMsg || 'Something went wrong', {
      duration: 4000,
      id: `error-${errorMsg.replace(/\s+/g, '-').toLowerCase()}`,
    })
  },
  info: (message: string) => {
    toast.info(message, {
      duration: 3000,
    })
  },
  loading: (message: string) => {
    return toast.loading(message)
  },
  dismiss: (id?: string | number) => {
    toast.dismiss(id)
  }
}
