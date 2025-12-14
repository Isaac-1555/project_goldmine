import React from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'

export type AppTooltipProps = {
  content: React.ReactNode
  children: React.ReactElement
  side?: Tooltip.TooltipContentProps['side']
  align?: Tooltip.TooltipContentProps['align']
  sideOffset?: number
}

export function AppTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 8,
}: AppTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="app-tooltip"
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          {content}
          <Tooltip.Arrow className="app-tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
