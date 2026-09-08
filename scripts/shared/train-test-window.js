// Splits a symbol's full price-row history into a TRAIN window (used for parameter search /
// AI model design) and `testYears` separate, non-overlapping 1-year TEST windows (each scored
// independently, never merged into one blended number) — shared by run-optimization-scan.js,
// run-auto-generate.js, and search-validated-best.js so all three pipelines slice "N years of
// training, M separate 1-year validation years" the same way.
//
// Anchored on today's calendar date (not each symbol's own latest row), so every symbol in
// the same run is judged against the identical calendar boundaries.

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
//
// testWindows[i].yearIndex is 1-based, counting from the year immediately after training (the
// OLDER validation year) up to the most recent year (closest to today) — e.g. with the default
// testYears=2, yearIndex 1 is "2 years ago to 1 year ago" and yearIndex 2 is "1 year ago to
// today". Each window's `endDate` is an exclusive upper bound, matching how `startDate` is
// already used as an inclusive lower bound elsewhere in this codebase.
function splitTrainTestWindows(rows, trainYears, testYears) {
  const today = new Date();
  const trainStartDate = toIsoDate(shiftYears(today, -(trainYears + testYears)));
  const trainEndDate = toIsoDate(shiftYears(today, -testYears));
  const trainRows = rows.filter((row) => row.date >= trainStartDate && row.date < trainEndDate);

  const testWindows = [];
  for (let yearsBack = testYears; yearsBack >= 1; yearsBack -= 1) {
    testWindows.push({
      yearIndex: testYears - yearsBack + 1,
      startDate: toIsoDate(shiftYears(today, -yearsBack)),
      endDate: yearsBack === 1 ? toIsoDate(today) : toIsoDate(shiftYears(today, -(yearsBack - 1))),
    });
  }

  return { trainRows, trainStartDate, trainEndDate, testWindows };
}

// Fixed-start variant for RE-validating an already-saved preset (server.js's
// handlePresetRevalidateApi) — every boundary is anchored to the preset's own original
// trainStartDate (frozen forever once first recorded) instead of re-anchoring the whole span to
// "today" the way splitTrainTestWindows does; only the final test window's end date is extended
// forward to latestDate. This is what makes a model's pass/fail status stop flipping purely
// because the rolling window silently slid a few days and picked up different boundary data —
// same "fixed start, grow the end" idea as scripts/universe/run-model-validation-daily.js, just
// applied to the manual 重新验证 path's train/test1/test2 window shape instead of a single
// cumulative window. Only ever called when a prior snapshot already exists for the preset AND its
// trainYears/testYears match the current request — splitTrainTestWindows still handles the first
// validation (which establishes the origin) and any request with a different window shape.
function splitFixedStartWindows(rows, trainYears, testYears, trainStartDate, latestDate) {
  const start = new Date(trainStartDate);
  const trainEndDate = toIsoDate(shiftYears(start, trainYears));
  const trainRows = rows.filter((row) => row.date >= trainStartDate && row.date < trainEndDate);

  const testWindows = [];
  for (let i = 0; i < testYears; i += 1) {
    const isLast = i === testYears - 1;
    testWindows.push({
      yearIndex: i + 1,
      startDate: toIsoDate(shiftYears(start, trainYears + i)),
      endDate: isLast ? latestDate : toIsoDate(shiftYears(start, trainYears + i + 1)),
    });
  }

  return { trainRows, trainStartDate, trainEndDate, testWindows };
}

module.exports = { shiftYears, toIsoDate, splitTrainTestWindows, splitFixedStartWindows };
