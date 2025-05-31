"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CustomCalendarProps {
  mode?: "single" | "range"
  selected?: Date | { from?: Date; to?: Date }
  onSelect?: (date: Date | { from?: Date; to?: Date } | undefined) => void
  numberOfMonths?: number
  className?: string
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function CustomCalendar({
  mode = "single",
  selected,
  onSelect,
  numberOfMonths = 1,
  className,
}: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date())

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isSelected = (date: Date) => {
    if (mode === "single" && selected instanceof Date) {
      return date.toDateString() === selected.toDateString()
    }
    if (mode === "range" && selected && typeof selected === "object" && "from" in selected) {
      if (selected.from && selected.to) {
        return date >= selected.from && date <= selected.to
      }
      if (selected.from) {
        return date.toDateString() === selected.from.toDateString()
      }
    }
    return false
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handleDateClick = (date: Date) => {
    if (mode === "single") {
      onSelect?.(date)
    } else if (mode === "range") {
      const rangeSelected = selected as { from?: Date; to?: Date } | undefined
      if (!rangeSelected?.from || (rangeSelected.from && rangeSelected.to)) {
        onSelect?.({ from: date, to: undefined })
      } else if (rangeSelected.from && !rangeSelected.to) {
        if (date < rangeSelected.from) {
          onSelect?.({ from: date, to: rangeSelected.from })
        } else {
          onSelect?.({ from: rangeSelected.from, to: date })
        }
      }
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const renderMonth = (monthOffset = 0) => {
    const displayDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1)
    const daysInMonth = getDaysInMonth(displayDate)
    const firstDay = getFirstDayOfMonth(displayDate)
    const daysInPrevMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 0).getDate()

    const days = []

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, daysInPrevMonth - i)
      days.push(
        <button
          key={`prev-${daysInPrevMonth - i}`}
          onClick={() => handleDateClick(date)}
          className="h-9 w-9 text-sm text-gray-400 hover:bg-gray-100 rounded-md flex items-center justify-center"
        >
          {daysInPrevMonth - i}
        </button>,
      )
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), day)
      const selected = isSelected(date)
      const today = isToday(date)

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          className={cn(
            "h-9 w-9 text-sm rounded-md flex items-center justify-center transition-colors",
            selected
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : today
                ? "bg-gray-100 font-medium hover:bg-gray-200"
                : "hover:bg-gray-100",
          )}
        >
          {day}
        </button>,
      )
    }

    // Next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
    const remainingCells = totalCells - (firstDay + daysInMonth)
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, day)
      days.push(
        <button
          key={`next-${day}`}
          onClick={() => handleDateClick(date)}
          className="h-9 w-9 text-sm text-gray-400 hover:bg-gray-100 rounded-md flex items-center justify-center"
        >
          {day}
        </button>,
      )
    }

    return (
      <div key={monthOffset} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {MONTHS[displayDate.getMonth()]} {displayDate.getFullYear()}
          </h3>
          {monthOffset === 0 && (
            <div className="flex space-x-1">
              <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="h-7 w-7 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="h-7 w-7 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Day headers - PERFECTLY ALIGNED */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="h-9 w-9 text-xs font-normal text-gray-500 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        {/* Date grid - PERFECTLY ALIGNED */}
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    )
  }

  return (
    <div className={cn("p-3", className)}>
      <div className={cn("flex space-x-4", numberOfMonths === 1 ? "justify-center" : "")}>
        {Array.from({ length: numberOfMonths }, (_, i) => renderMonth(i))}
      </div>
    </div>
  )
}
