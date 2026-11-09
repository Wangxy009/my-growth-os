// 2026-2027-1 课表结构化数据。
// 来源：timeTableForStu12-2.pdf。PDF 仅提供节次，没有提供每节的钟点，
// 因此排程器当前使用“星期 + 周次 + 节次”作为时间坐标，不臆造具体时钟时间。
const TERM_START = "2026-09-07"; // 第 1 周周一，可在设置中调整

const PERIOD_LABELS = {
  "1-2": "第 1—2 节",
  "3-4": "第 3—4 节",
  "3-5": "第 3—5 节",
  "6-7": "第 6—7 节",
  "6-8": "第 6—8 节",
  "9-10": "第 9—10 节"
};

const COURSE_SCHEDULE = [
  { name: "应用随机过程", weekday: 1, periods: "1-2", weeks: [18], hardBlock: true },
  { name: "习近平经济思想概论", weekday: 2, periods: "1-2", weeks: [...range(1, 4), ...range(6, 17)], hardBlock: false },
  { name: "财政学", weekday: 4, periods: "1-2", weeks: range(1, 17), hardBlock: true },
  { name: "应用随机过程", weekday: 5, periods: "1-2", weeks: [...range(1, 2), ...range(5, 16)], hardBlock: true },
  { name: "证券投资学", weekday: 2, periods: "3-5", weeks: [...range(1, 4), ...range(6, 11)], hardBlock: false },
  { name: "证券投资学", weekday: 2, periods: "3-4", weeks: range(12, 13), hardBlock: false },
  { name: "应用随机过程", weekday: 3, periods: "3-4", weeks: [...range(1, 4), ...range(6, 16)], hardBlock: true },
  { name: "跨国公司金融管理", weekday: 4, periods: "3-5", weeks: [...range(1, 3), ...range(5, 13)], hardBlock: false },
  { name: "跨国公司金融管理", weekday: 4, periods: "3-4", weeks: range(14, 15), hardBlock: false },
  { name: "保险学", weekday: 3, periods: "6-7", weeks: range(13, 14), hardBlock: false },
  { name: "金融科技", weekday: 5, periods: "6-7", weeks: range(12, 13), hardBlock: true },
  { name: "保险学", weekday: 6, periods: "6-8", weeks: [5], hardBlock: false },
  { name: "金融科技", weekday: 7, periods: "6-8", weeks: [2], hardBlock: true },
  { name: "金融伦理", weekday: 1, periods: "9-10", weeks: [...range(1, 4), ...range(6, 9)], hardBlock: false },
  { name: "金融风险管理", weekday: 3, periods: "9-10", weeks: [...range(1, 4), ...range(6, 16)], hardBlock: false },
  { name: "形势与政策", weekday: 4, periods: "9-10", weeks: range(10, 13), hardBlock: false }
];

const UNSCHEDULED_COURSES = [
  { name: "未来趋势与职业前景", weeks: range(1, 8), hardBlock: false, timePending: true },
  { name: "企业数字化运营实训", weeks: range(1, 9), hardBlock: false, timePending: true }
];

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function academicWeek(date) {
  const start = parseDateOnly(TERM_START);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((target - start) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function weekdayMondayFirst(date) {
  return date.getDay() === 0 ? 7 : date.getDay();
}

function getScheduleForDate(date) {
  const weekday = weekdayMondayFirst(date);
  const week = academicWeek(date);
  return COURSE_SCHEDULE
    .filter(item => item.weekday === weekday && item.weeks.includes(week))
    .sort((a, b) => a.periods.localeCompare(b.periods))
    .map(item => ({ ...item, week, periodLabel: PERIOD_LABELS[item.periods] || item.periods }));
}

function getNextDate(date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + 1);
  return next;
}
