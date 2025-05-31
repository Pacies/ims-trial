"use client"

import { CustomCalendar } from "./custom-calendar"

export type CalendarProps = {
  mode?: "single" | "range"
  selected?: Date | { from?: Date; to?: Date }
  onSelect?: (date: Date | { from?: Date; to?: Date } | undefined) => void
  numberOfMonths?: number
  className?: string
  initialFocus?: boolean
  defaultMonth?: Date
}

function Calendar({ initialFocus, defaultMonth, ...props }: CalendarProps) {
  return <CustomCalendar {...props} />
}

Calendar.displayName = "Calendar"

export { Calendar }
