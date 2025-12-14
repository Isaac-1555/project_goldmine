import React, { createContext, useCallback, useMemo, useRef, useState } from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { X } from 'lucide-react'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'confirm'

type ToastAction = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

export type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
  actions?: ToastAction[]
  // Internal hook: if provided, invoked when the toast is dismissed/closed.
  onDismiss?: () => void
}

type InternalToast = ToastOptions & {
  id: string
  open: boolean
}

export type ConfirmToastOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  durationMs?: number
}

export type ToastApi = {
  show: (toast: ToastOptions) => string
  dismiss: (id: string) => void
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  confirm: (opts: ConfirmToastOptions) => Promise<boolean>
}

export const ToastContext = createContext<ToastApi | null>(null)

function createId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

function actionClass(variant?: ToastAction['variant']) {
  switch (variant) {
    case 'primary':
      return 'btn btn-primary btn-sm'
    case 'danger':
      return 'btn btn-danger btn-sm'
    case 'secondary':
    default:
      return 'btn btn-outline btn-sm'
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<InternalToast[]>([])

  const removeAfterCloseTimeouts = useRef<Record<string, number>>({})

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))

    const timeoutId = removeAfterCloseTimeouts.current[id]
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      delete removeAfterCloseTimeouts.current[id]
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, open: false } : t))
    )

    // Ensure removal even if onOpenChange doesn't fire (defensive)
    removeAfterCloseTimeouts.current[id] = window.setTimeout(() => {
      removeToast(id)
    }, 400)
  }, [removeToast])

  const show = useCallback((toast: ToastOptions) => {
    const id = createId()
    const next: InternalToast = {
      id,
      open: true,
      variant: toast.variant || 'default',
      durationMs: toast.durationMs,
      title: toast.title,
      description: toast.description,
      actions: toast.actions,
      onDismiss: toast.onDismiss,
    }

    setToasts((prev) => [...prev, next])
    return id
  }, [])

  const success = useCallback((title: string, description?: string) => {
    return show({ title, description, variant: 'success' })
  }, [show])

  const error = useCallback((title: string, description?: string) => {
    return show({ title, description, variant: 'error' })
  }, [show])

  const info = useCallback((title: string, description?: string) => {
    return show({ title, description, variant: 'info' })
  }, [show])

  const warning = useCallback((title: string, description?: string) => {
    return show({ title, description, variant: 'warning' })
  }, [show])

  const confirm = useCallback((opts: ConfirmToastOptions) => {
    const {
      title,
      description,
      confirmLabel = 'OK',
      cancelLabel = 'Cancel',
      durationMs = 30000,
    } = opts

    return new Promise<boolean>((resolve) => {
      let resolved = false

      const safeResolve = (value: boolean) => {
        if (resolved) return
        resolved = true
        resolve(value)
      }

      const id = show({
        title,
        description,
        variant: 'confirm',
        durationMs,
        onDismiss: () => safeResolve(false),
        actions: [
          {
            label: cancelLabel,
            variant: 'secondary',
            onClick: () => {
              safeResolve(false)
              dismiss(id)
            },
          },
          {
            label: confirmLabel,
            variant: 'primary',
            onClick: () => {
              safeResolve(true)
              dismiss(id)
            },
          },
        ],
      })
      void id
    })
  }, [dismiss, show])

  const api: ToastApi = useMemo(
    () => ({
      show,
      dismiss,
      success,
      error,
      info,
      warning,
      confirm,
    }),
    [show, dismiss, success, error, info, warning, confirm]
  )

  return (
    <RadixToast.Provider swipeDirection="right">
      <ToastContext.Provider value={api}>
        {children}
        <RadixToast.Viewport className="toast-viewport" />
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            open={toast.open}
            duration={toast.durationMs}
            onOpenChange={(open) => {
              if (!open) {
                toast.onDismiss?.()
                // Delay removal slightly so CSS exit animations can complete
                window.setTimeout(() => removeToast(toast.id), 250)
              }
            }}
            className="toast-root"
            data-variant={toast.variant}
          >
            <div className="toast-body">
              <RadixToast.Title className="toast-title">{toast.title}</RadixToast.Title>
              {toast.description ? (
                <RadixToast.Description className="toast-description">
                  {toast.description}
                </RadixToast.Description>
              ) : null}
              {toast.actions && toast.actions.length > 0 ? (
                <div className="toast-actions">
                  {toast.actions.map((action, idx) => (
                    <RadixToast.Action
                      key={`${toast.id}_action_${idx}`}
                      asChild
                      altText={action.label}
                    >
                      <button
                        type="button"
                        className={actionClass(action.variant)}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </button>
                    </RadixToast.Action>
                  ))}
                </div>
              ) : null}
            </div>
            <RadixToast.Close asChild aria-label="Close">
              <button type="button" className="toast-close">
                <X size={16} />
              </button>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
      </ToastContext.Provider>
    </RadixToast.Provider>
  )
}
