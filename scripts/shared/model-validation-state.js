async function ensureModelValidationStateTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS model_validation_states (
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      scan_result_id TEXT,
      preset_id TEXT,
      watch_id TEXT,
      owner_user_id TEXT,
      owner_email TEXT NOT NULL DEFAULT '',
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      model_label TEXT NOT NULL DEFAULT '',
      strategy_type TEXT NOT NULL DEFAULT '',
      validation_start_date DATE,
      original_validation_end_date DATE,
      latest_trade_date DATE,
      cumulative_days INTEGER NOT NULL DEFAULT 0,
      cumulative_return_rate DOUBLE PRECISION,
      cumulative_annualized_return DOUBLE PRECISION,
      cumulative_max_drawdown DOUBLE PRECISION,
      cumulative_trades INTEGER NOT NULL DEFAULT 0,
      cumulative_buy_hold_return_rate DOUBLE PRECISION,
      cumulative_buy_hold_max_drawdown DOUBLE PRECISION,
      incremental_start_date DATE,
      incremental_days INTEGER NOT NULL DEFAULT 0,
      incremental_return_rate DOUBLE PRECISION,
      incremental_annualized_return DOUBLE PRECISION,
      incremental_max_drawdown DOUBLE PRECISION,
      incremental_trades INTEGER NOT NULL DEFAULT 0,
      incremental_buy_hold_return_rate DOUBLE PRECISION,
      incremental_buy_hold_max_drawdown DOUBLE PRECISION,
      target_percent DOUBLE PRECISION NOT NULL DEFAULT 50,
      original_validation_max_drawdown DOUBLE PRECISION,
      min_incremental_days INTEGER NOT NULL DEFAULT 60,
      min_incremental_trades INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'insufficient',
      status_reason TEXT NOT NULL DEFAULT '',
      last_checked_at TIMESTAMPTZ,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(subject_type, subject_id)
    );
    CREATE INDEX IF NOT EXISTS model_validation_states_preset_idx ON model_validation_states(preset_id);
    CREATE INDEX IF NOT EXISTS model_validation_states_watch_idx ON model_validation_states(watch_id);
    CREATE INDEX IF NOT EXISTS model_validation_states_symbol_idx ON model_validation_states(symbol, market);
    CREATE INDEX IF NOT EXISTS model_validation_states_status_idx ON model_validation_states(status, last_checked_at DESC);
  `);
}

module.exports = { ensureModelValidationStateTable };
