// Splits a symbol's full price-row history into a TRAIN window (used for parameter search /
// AI model design) and a TEST window (used afterward, unchanged, purely to measure how the
// found config performs on data it never saw) — shared by run-optimization-scan.js and
// run-auto-generate.js so both pipelines slice "N years ago to M years ago" the same way.
//
// Anchored on today's calendar date (not each symbol's own latest row), so every symbol in
// the same run is judged against the identical calendar train/test boundary.

function shiftYears(date, years) {
  const shifted = new Date(date.getTime());
  shifted.setFullYear(shifted.getFullYear() + years);
  return shifted;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

// rows must already be sorted ascending by `date` (a "YYYY-MM-DD" string) — every loadRows()
// in this codebase already returns them that way (ORDER BY trade_date ASC).
function splitTrainTestRows(rows, trainYearsAgo, testYearsAgo) {
  const today = new Date();
  const trainStartDate = toIsoDate(shiftYears(today, -trainYearsAgo));
  const testStartDate = toIsoDate(shiftYears(today, -testYearsAgo));
  const trainRows = rows.filter((row) => row.date >= trainStartDate && row.date < testStartDate);
  const testRows = rows.filter((row) => row.date >= testStartDate);
  return { trainRows, testRows, trainStartDate, testStartDate };
}

module.exports = { splitTrainTestRows };
