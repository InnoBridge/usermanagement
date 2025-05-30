const CREATE_VERSION_TABLE_QUERY = 
    `CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

const GET_SCHEMA_VERSION_QUERY = 
    `SELECT COALESCE(MAX(version), 0) as version FROM schema_versions`;

const UPDATE_SCHEMA_VERSION_QUERY = 
    `INSERT INTO schema_versions (version) VALUES ($1)`;

const CREATE_USERS_TABLE_QUERY = 
    `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        image_url TEXT NOT NULL,
        password_enabled BOOLEAN NOT NULL DEFAULT false,
        two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
        backup_code_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

// Email addresses table queries
const CREATE_EMAIL_ADDRESSES_TABLE_QUERY = 
    `CREATE TABLE IF NOT EXISTS email_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_address VARCHAR(255) NOT NULL UNIQUE
    )`;

const CREATE_USERS_USERNAME_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`;

const CREATE_EMAIL_ADDRESSES_USER_ID_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_email_addresses_user_id ON email_addresses(user_id)`;

const CREATE_EMAIL_ADDRESSES_EMAIL_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_email_addresses_email ON email_addresses(email_address)`;


export {
    CREATE_VERSION_TABLE_QUERY,
    GET_SCHEMA_VERSION_QUERY,
    UPDATE_SCHEMA_VERSION_QUERY,
    CREATE_USERS_TABLE_QUERY,
    CREATE_EMAIL_ADDRESSES_TABLE_QUERY,
    CREATE_USERS_USERNAME_INDEX,
    CREATE_EMAIL_ADDRESSES_USER_ID_INDEX,
    CREATE_EMAIL_ADDRESSES_EMAIL_INDEX
};