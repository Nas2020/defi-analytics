import { Database } from "bun:sqlite";
import { join } from 'path';

interface PreparedStatement<T = any> {
    get: (...params: any[]) => T | undefined;
    run: (...params: any[]) => { changes: number };
    all: (...params: any[]) => T[];
}

const dbPath = join(process.cwd(), 'db.sqlite');
const db = new Database(dbPath);

// Initialize database tables
db.run(`
    -- Table for caching VSG info
    CREATE TABLE IF NOT EXISTS vsg_info (
        id INTEGER PRIMARY KEY,
        data TEXT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Table for caching basic account balances
    CREATE TABLE IF NOT EXISTS account_balances (
        address TEXT,
        balance TEXT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table for caching token balances and data
    CREATE TABLE IF NOT EXISTS address_tokens (
        address TEXT,
        data TEXT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table for caching transactions
    CREATE TABLE IF NOT EXISTS address_transactions (
        address TEXT,
        page_number TEXT,
        page_size TEXT,
        data TEXT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table for caching address info
    CREATE TABLE IF NOT EXISTS address_info (
        address TEXT,
        data TEXT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indices for faster lookups
    CREATE INDEX IF NOT EXISTS idx_account_balances_address 
        ON account_balances(address);
    
    CREATE INDEX IF NOT EXISTS idx_address_tokens_address 
        ON address_tokens(address);

    CREATE INDEX IF NOT EXISTS idx_address_transactions_lookup 
        ON address_transactions(address, page_number, page_size);

    CREATE INDEX IF NOT EXISTS idx_address_info_address 
        ON address_info(address);
`);

function prepare<T = any>(sql: string): PreparedStatement<T> {
    const stmt = db.prepare(sql);
    return {
        get: (...params: any[]) => stmt.get(...params) as T | undefined,
        run: (...params: any[]) => stmt.run(...params),
        all: (...params: any[]) => stmt.all(...params) as T[]
    };
}

export default {
    prepare,
    exec: (sql: string) => db.run(sql)
};