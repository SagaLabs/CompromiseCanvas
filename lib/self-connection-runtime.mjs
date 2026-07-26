const SHORT_ENGLISH_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/

const isLeapYear = (year) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

const daysInMonth = (year, month) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  if ([4, 6, 9, 11].includes(month)) return 30
  return 31
}

const isValidIsoTimestamp = (timestamp) => {
  const match = timestamp.match(ISO_TIMESTAMP_PATTERN)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? "0")

  if (month < 1 || month > 12) return false
  if (day < 1 || day > daysInMonth(year, month)) return false
  if (hour > 23 || minute > 59 || second > 59) return false

  if (match[7] !== "Z") {
    const offsetHour = Number(match[7].slice(1, 3))
    const offsetMinute = Number(match[7].slice(4, 6))
    if (offsetHour > 23 || offsetMinute > 59) return false
  }

  return true
}

/**
 * Calculates the visual center of each touching parallel lane around zero.
 * Only base stroke widths belong in this calculation. Selection emphasis is
 * a drawing concern and deliberately is not part of this API.
 */
export const getCenteredParallelLaneCenters = (baseStrokeWidths) => {
  if (!Array.isArray(baseStrokeWidths)) {
    throw new TypeError("baseStrokeWidths must be an array")
  }

  baseStrokeWidths.forEach((strokeWidth) => {
    if (
      typeof strokeWidth !== "number" ||
      !Number.isFinite(strokeWidth) ||
      strokeWidth <= 0
    ) {
      throw new RangeError(
        "baseStrokeWidths must contain only positive finite numbers",
      )
    }
  })

  const bundleWidth = baseStrokeWidths.reduce(
    (total, strokeWidth) => total + strokeWidth,
    0,
  )
  let laneStart = -bundleWidth / 2

  return baseStrokeWidths.map((strokeWidth) => {
    const center = laneStart + strokeWidth / 2
    laneStart += strokeWidth
    return center
  })
}

/**
 * Formats a stored ISO timestamp using the browser's local calendar and time.
 * A timeZone override is available for deterministic tests. Invalid values are
 * omitted instead of leaking an unparsed value into the compact card.
 */
export const formatCompactLocalTimestamp = (
  timestamp,
  { timeZone } = {},
) => {
  if (
    typeof timestamp !== "string" ||
    !isValidIsoTimestamp(timestamp)
  ) {
    return null
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null

  try {
    const options = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
    if (timeZone) options.timeZone = timeZone

    const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(
      date,
    )
    const calendar = Object.fromEntries(
      parts
        .filter(({ type }) =>
          ["month", "day", "hour", "minute"].includes(type),
        )
        .map(({ type, value }) => [type, value]),
    )
    const monthName =
      SHORT_ENGLISH_MONTH_NAMES[Number(calendar.month) - 1]

    if (
      !monthName ||
      !calendar.day ||
      !calendar.hour ||
      !calendar.minute
    ) {
      return null
    }

    return `${Number(calendar.day)} ${monthName} ${calendar.hour.padStart(2, "0")}:${calendar.minute.padStart(2, "0")}`
  } catch {
    return null
  }
}
