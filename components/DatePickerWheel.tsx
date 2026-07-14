import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { StyleSheet, View, ScrollView, type ViewStyle } from "react-native";
import { AppText } from "./ui/Text";
import { Colors, Spacing } from "@/constants/theme";

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const HALF = Math.floor(VISIBLE_ROWS / 2);
const SCROLL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

export type DateOrder = "dmy" | "mdy";
export type MonthMode = "number" | "name";

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const MONTH_NUMBERS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12",
];


const formatDay = (val: string | number) => String(val).padStart(2, "0");
const formatMonth = (val: string | number) => val as string;
const formatYear = (val: string | number) => String(val);

export interface ColumnLabel {
  day: string;
  month: string;
  year: string;
}

interface DatePickerColumnProps {
  values: (string | number)[];
  selectedIndex: number;
  onChange: (index: number) => void;
  format?: (value: string | number, index: number) => string;
  width: number;
  label: string;
  testID?: string;
}

const DatePickerColumn = memo(function DatePickerColumn({
  values,
  selectedIndex,
  onChange,
  format,
  width,
  label,
  testID,
}: DatePickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isAnimating = useRef(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const paddedValues = useMemo(() => {
    const pad: (string | number)[] = [];
    for (let i = 0; i < HALF; i++) pad.push("");
    return [...pad, ...values, ...pad];
  }, [values]);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(id);

  }, [selectedIndex, values.length]);

  const handleScroll: ComponentProps<typeof ScrollView>["onScroll"] = (e) => {
    if (isAnimating.current) return;
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
    }
  };

  const handleScrollEnd: ComponentProps<typeof ScrollView>["onMomentumScrollEnd"] = (e) => {
    handleSnap(e.nativeEvent.contentOffset.y);
  };

  const handleScrollEndDrag: ComponentProps<typeof ScrollView>["onScrollEndDrag"] = (e) => {
    const vel = e.nativeEvent.velocity;
    if (Math.abs(vel?.y ?? 0) < 0.1) {
      handleSnap(e.nativeEvent.contentOffset.y);
    }
  };

  const handleSnap = (offsetY: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    scrollRef.current?.scrollTo({
      y: clamped * ITEM_HEIGHT,
      animated: true,
    });
    setActiveIndex(clamped);
    onChange(clamped);
    setTimeout(() => { isAnimating.current = false; }, 150);
  };

  const renderItem = (val: string | number, i: number) => {
    if (val === "") {
      return <View key={`pad-${i}`} style={{ height: ITEM_HEIGHT }} />;
    }
    const realIndex = i - HALF;
    const distance = Math.abs(realIndex - activeIndex);
    const isSelected = distance === 0;
    const opacity = isSelected ? 1 : Math.max(0.25, 1 - distance * 0.22);
    return (
      <View
        key={`${testID}-${val}-${i}`}
        style={[styles.item, { height: ITEM_HEIGHT, opacity }]}
      >
        <AppText
          variant={isSelected ? "heading" : "body"}
          color={isSelected ? Colors.text : Colors.textSecondary}
          style={styles.itemText}
          numberOfLines={1}
        >
          {format ? format(val, realIndex) : String(val)}
        </AppText>
      </View>
    );
  };

  return (
    <View style={[styles.column, { width }]}>
      <View style={styles.columnLabel}>
        <AppText
          variant="caption"
          color={Colors.textSecondary}
          style={styles.columnLabelText}
        >
          {label}
        </AppText>
      </View>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {paddedValues.map(renderItem)}
      </ScrollView>
    </View>
  );
});

interface DatePickerWheelProps {
  date: Date;
  onChange: (date: Date) => void;
  minYear?: number;
  maxYear?: number;
  minDate?: Date;
  order?: DateOrder;
  monthMode?: MonthMode;
  labels?: ColumnLabel;
}

export function DatePickerWheel({
  date,
  onChange,
  minYear = new Date().getFullYear() - 2,
  maxYear = new Date().getFullYear() + 10,
  minDate,
  order = "dmy",
  monthMode = "number",
  labels = { day: "Día", month: "Mes", year: "Año" },
}: DatePickerWheelProps) {

  const minDateTime = minDate
    ? Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate())
    : null;
  const minDateUTC = useMemo(
    () => (minDateTime != null ? new Date(minDateTime) : null),
    [minDateTime],
  );
  const effectiveMinYear = Math.max(minYear, minDateUTC ? minDateUTC.getUTCFullYear() : 0);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = effectiveMinYear; y <= maxYear; y++) arr.push(y);
    return arr;
  }, [effectiveMinYear, maxYear]);

  const monthWidth = monthMode === "name" ? 64 : 56;

  const daysInMonth = useMemo(() => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return d.getUTCDate();
  }, [date.getUTCFullYear(), date.getUTCMonth()]);

  const days = useMemo(() => {
    const arr: number[] = [];
    const startDay =
      minDateUTC &&
      date.getUTCFullYear() === minDateUTC.getUTCFullYear() &&
      date.getUTCMonth() === minDateUTC.getUTCMonth()
        ? minDateUTC.getUTCDate()
        : 1;
    for (let d = startDay; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [daysInMonth, minDateUTC, date.getUTCFullYear(), date.getUTCMonth()]);

  const visibleMonthCount = useMemo(() => {
    if (minDateUTC && date.getUTCFullYear() === minDateUTC.getUTCFullYear()) {
      return 12 - minDateUTC.getUTCMonth();
    }
    return 12;
  }, [minDateUTC, date.getUTCFullYear()]);

  const monthStartOffset = useMemo(() => {
    if (minDateUTC && date.getUTCFullYear() === minDateUTC.getUTCFullYear()) {
      return minDateUTC.getUTCMonth();
    }
    return 0;
  }, [minDateUTC, date.getUTCFullYear()]);

  const visibleMonthValues = useMemo(
    () => {
      const start = monthStartOffset;
      const count = visibleMonthCount;
      return monthMode === "name"
        ? MONTH_SHORT.slice(start, start + count)
        : MONTH_NUMBERS.slice(start, start + count);
    },
    [monthMode, monthStartOffset, visibleMonthCount],
  );

  const selectedYearIndex = useMemo(
    () => Math.max(0, years.indexOf(date.getUTCFullYear())),
    [years, date.getUTCFullYear()],
  );
  const selectedMonthIndex = useMemo(
    () => Math.max(0, date.getUTCMonth() - monthStartOffset),
    [date.getUTCMonth(), monthStartOffset],
  );
  const selectedDayIndex = useMemo(
    () => Math.max(0, days.indexOf(date.getUTCDate())),
    [days, date.getUTCDate()],
  );


  const dateRef = useRef(date);
  dateRef.current = date;
  const daysRef = useRef(days);
  daysRef.current = days;
  const yearsRef = useRef(years);
  yearsRef.current = years;
  const minRef = useRef(minDateUTC);
  minRef.current = minDateUTC;
  const monthStartRef = useRef(monthStartOffset);
  monthStartRef.current = monthStartOffset;

  const handleYearChange = useCallback(
    (index: number) => {
      const date = dateRef.current;
      const minDateUTC = minRef.current;
      const newYear = yearsRef.current[index];
      const newDaysInMonth = new Date(Date.UTC(newYear, date.getUTCMonth() + 1, 0)).getUTCDate();
      const newDay = Math.min(date.getUTCDate(), newDaysInMonth);

      if (minDateUTC && newYear === minDateUTC.getUTCFullYear()) {
        const newMonth = Math.max(date.getUTCMonth(), minDateUTC.getUTCMonth());
        if (newMonth === minDateUTC.getUTCMonth()) {
          const newDayClamped = Math.max(newDay, minDateUTC.getUTCDate());
          onChange(new Date(Date.UTC(newYear, newMonth, newDayClamped)));
          return;
        }
        onChange(new Date(Date.UTC(newYear, newMonth, newDay)));
        return;
      }

      onChange(new Date(Date.UTC(newYear, date.getUTCMonth(), newDay)));
    },
    [onChange],
  );

  const handleMonthChange = useCallback(
    (index: number) => {
      const date = dateRef.current;
      const minDateUTC = minRef.current;
      const realMonth = index + monthStartRef.current;
      const newDaysInMonth = new Date(Date.UTC(date.getUTCFullYear(), realMonth + 1, 0)).getUTCDate();
      const newDay = Math.min(date.getUTCDate(), newDaysInMonth);

      if (
        minDateUTC &&
        date.getUTCFullYear() === minDateUTC.getUTCFullYear() &&
        realMonth === minDateUTC.getUTCMonth()
      ) {
        const newDayClamped = Math.max(newDay, minDateUTC.getUTCDate());
        onChange(new Date(Date.UTC(date.getUTCFullYear(), realMonth, newDayClamped)));
        return;
      }

      onChange(new Date(Date.UTC(date.getUTCFullYear(), realMonth, newDay)));
    },
    [onChange],
  );

  const handleDayChange = useCallback(
    (index: number) => {
      const date = dateRef.current;
      onChange(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), daysRef.current[index])));
    },
    [onChange],
  );

  const dayColumn = (
    <DatePickerColumn
      key="day"
      testID="day"
      values={days}
      selectedIndex={selectedDayIndex}
      onChange={handleDayChange}
      width={56}
      label={labels.day}
      format={formatDay}
    />
  );

  const monthColumn = (
    <DatePickerColumn
      key="month"
      testID="month"
      values={visibleMonthValues}
      selectedIndex={selectedMonthIndex}
      onChange={handleMonthChange}
      width={monthWidth}
      label={labels.month}
      format={formatMonth}
    />
  );

  const yearColumn = (
    <DatePickerColumn
      key="year"
      testID="year"
      values={years}
      selectedIndex={selectedYearIndex}
      onChange={handleYearChange}
      width={72}
      label={labels.year}
      format={formatYear}
    />
  );

  const columns = order === "dmy"
    ? [dayColumn, monthColumn, yearColumn]
    : [monthColumn, dayColumn, yearColumn];

  return (
    <View style={styles.row}>
      <View style={styles.highlightBar} pointerEvents="none" />
      {columns}
    </View>
  );
}

const styles = StyleSheet.create({
  highlightBar: {
    position: "absolute",
    top: HALF * ITEM_HEIGHT + 20,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: Colors.white,
    borderRadius: 12,
    zIndex: -1,
  } as ViewStyle,
  row: {
    position: "relative",
    flexDirection: "row",
    height: SCROLL_HEIGHT + 20,
    gap: Spacing.xs,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  column: {
    height: SCROLL_HEIGHT + 20,
    overflow: "hidden",
  },
  columnLabel: {
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  columnLabelText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  item: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  } as ViewStyle,
  itemText: {
    textAlign: "center",
  },
});

export default DatePickerWheel;
