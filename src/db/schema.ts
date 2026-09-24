export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS local_settings (
     _local_id TEXT PRIMARY KEY,
     _server_id TEXT,
     _sync_status TEXT NOT NULL DEFAULT 'pending',
     _dirty INTEGER NOT NULL DEFAULT 1,
     _deleted INTEGER NOT NULL DEFAULT 0,
     _created_at TEXT NOT NULL,
     _updated_at TEXT NOT NULL,
     user_id TEXT NOT NULL,
     source_ret_pct REAL NOT NULL DEFAULT 1,
     ica_ret_pct REAL NOT NULL DEFAULT 1,
     tie_mode TEXT NOT NULL DEFAULT 'deduct',
     tie_fixed REAL NOT NULL DEFAULT 130000,
     tie_per_moto REAL NOT NULL DEFAULT 4000,
     advance_pct REAL NOT NULL DEFAULT 70,
     unload_per_moto REAL NOT NULL DEFAULT 3500,
     ten_pct_enabled INTEGER NOT NULL DEFAULT 0,
     ten_pct_label TEXT NOT NULL DEFAULT 'Concepto 10%',
     ten_pct_base TEXT NOT NULL DEFAULT 'net_freight',
     ten_pct_kind TEXT NOT NULL DEFAULT 'discount',
     ten_pct_affects TEXT NOT NULL DEFAULT 'freight',
     ten_pct_value REAL NOT NULL DEFAULT 10
     currency TEXT DEFAULT 'COP'
  );`,

  `CREATE TABLE IF NOT EXISTS local_trucks (
     _local_id TEXT PRIMARY KEY,
     _server_id TEXT,
     _sync_status TEXT NOT NULL DEFAULT 'pending',
     _dirty INTEGER NOT NULL DEFAULT 1,
     _deleted INTEGER NOT NULL DEFAULT 0,
     _created_at TEXT NOT NULL,
     _updated_at TEXT NOT NULL,
     user_id TEXT NOT NULL,
     plate TEXT NOT NULL,
     brand TEXT, model TEXT, year INTEGER, mileage INTEGER DEFAULT 0, notes TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS local_trips (
     _local_id TEXT PRIMARY KEY,
     _server_id TEXT,
     _sync_status TEXT NOT NULL DEFAULT 'pending',
     _dirty INTEGER NOT NULL DEFAULT 1,
     _deleted INTEGER NOT NULL DEFAULT 0,
     _created_at TEXT NOT NULL,
     _updated_at TEXT NOT NULL,
     user_id TEXT NOT NULL,
     truck_id TEXT,
     trip_number TEXT NOT NULL,
     date TEXT NOT NULL,
     client TEXT NOT NULL,
     origin TEXT NOT NULL,
     destination TEXT NOT NULL,
     cargo_type TEXT,
     moto_qty INTEGER NOT NULL,
     gross_freight REAL NOT NULL,
     net_freight REAL NOT NULL,
     advance REAL NOT NULL,
     balance REAL NOT NULL,
     status TEXT NOT NULL DEFAULT 'in_progress',
     balance_status TEXT NOT NULL DEFAULT 'pending',
     balance_paid_at TEXT,
     balance_amount REAL,
     balance_method TEXT,
     balance_notes TEXT,
     notes TEXT,
     initial_mileage INTEGER,
     final_mileage INTEGER
  );`,

  `CREATE INDEX IF NOT EXISTS idx_trips_dirty ON local_trips(_dirty);`,
  `CREATE INDEX IF NOT EXISTS idx_trips_server ON local_trips(_server_id);`,

  `CREATE TABLE IF NOT EXISTS local_trip_discounts (
     _local_id TEXT PRIMARY KEY,
     _server_id TEXT,
     _sync_status TEXT NOT NULL DEFAULT 'pending',
     _dirty INTEGER NOT NULL DEFAULT 1,
     _deleted INTEGER NOT NULL DEFAULT 0,
     _created_at TEXT NOT NULL,
     _updated_at TEXT NOT NULL,
     trip_id TEXT NOT NULL,
     code TEXT NOT NULL,
     label TEXT NOT NULL,
     amount REAL NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_expenses (
     _local_id TEXT PRIMARY KEY,
     _server_id TEXT,
     _sync_status TEXT NOT NULL DEFAULT 'pending',
     _dirty INTEGER NOT NULL DEFAULT 1,
     _deleted INTEGER NOT NULL DEFAULT 0,
     _created_at TEXT NOT NULL,
     _updated_at TEXT NOT NULL,
     user_id TEXT NOT NULL,
     trip_id TEXT,
     category_code TEXT NOT NULL,
     description TEXT,
     amount REAL NOT NULL,
     date TEXT NOT NULL,
     mileage INTEGER,
     receipt_url TEXT,
     receipt_local TEXT,
     notes TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS local_payments (
     _local_id TEXT PRIMARY KEY,
     _server_id TEXT,
     _sync_status TEXT NOT NULL DEFAULT 'pending',
     _dirty INTEGER NOT NULL DEFAULT 1,
     _deleted INTEGER NOT NULL DEFAULT 0,
     _created_at TEXT NOT NULL,
     _updated_at TEXT NOT NULL,
     user_id TEXT NOT NULL,
     trip_id TEXT NOT NULL,
     kind TEXT NOT NULL,
     amount REAL NOT NULL,
     date TEXT NOT NULL,
     method TEXT,
     notes TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS sync_queue (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     table_name TEXT NOT NULL,
     local_id TEXT NOT NULL,
     op TEXT NOT NULL,
     created_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS sync_state (
     key TEXT PRIMARY KEY,
     value TEXT
  );`,
];