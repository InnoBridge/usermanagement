const CREATE_VERSION_TABLE_QUERY = 
    `CREATE TABLE IF NOT EXISTS user_schema_versions (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

const GET_SCHEMA_VERSION_QUERY = 
    `SELECT COALESCE(MAX(version), 0) as version FROM user_schema_versions`;

const UPDATE_SCHEMA_VERSION_QUERY = 
    `INSERT INTO user_schema_versions (version) VALUES ($1)`;

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
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_address VARCHAR(255) NOT NULL UNIQUE
    )`;

const CREATE_USERS_USERNAME_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`;

const CREATE_EMAIL_ADDRESSES_USER_ID_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_email_addresses_user_id ON email_addresses(user_id)`;

const CREATE_EMAIL_ADDRESSES_EMAIL_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_email_addresses_email ON email_addresses(email_address)`;

const COUNT_USERS_QUERY =
    `SELECT COUNT(*) as total 
     FROM users 
     WHERE $1::BIGINT IS NULL OR updated_at > to_timestamp($1::BIGINT/1000.0)`;

const GET_USERS_QUERY =
    `SELECT u.id, u.username, u.first_name, u.last_name, u.image_url, 
            u.password_enabled, u.two_factor_enabled, u.backup_code_enabled,
            u.created_at, u.updated_at
     FROM users u
     WHERE ($1::BIGINT IS NULL OR u.updated_at > to_timestamp($1::BIGINT/1000.0))
     ORDER BY u.updated_at DESC
     LIMIT $2 OFFSET $3`;

const GET_USERS_BY_IDS_QUERY = 
    `SELECT u.id, u.username, u.first_name, u.last_name, u.image_url, 
            u.password_enabled, u.two_factor_enabled, u.backup_code_enabled,
            u.created_at, u.updated_at
     FROM users u
     WHERE u.id = ANY($1)
     ORDER BY u.updated_at DESC`;

const GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY = 
    `SELECT id, user_id, email_address 
     FROM email_addresses 
     WHERE user_id = ANY($1)
     ORDER BY user_id`;
    
const GET_LATEST_USER_UPDATE_QUERY = 
    `SELECT MAX(updated_at) as latest_update FROM users`;

const UPSERT_USERS_QUERY = 
    `INSERT INTO users (id, username, first_name, last_name, image_url, password_enabled, two_factor_enabled, backup_code_enabled, created_at, updated_at)
     SELECT 
        id,
        username,
        first_name,
        last_name,
        image_url,
        password_enabled,
        two_factor_enabled,
        backup_code_enabled,
        to_timestamp(created_at::BIGINT/1000.0),
        to_timestamp(updated_at::BIGINT/1000.0)
     FROM 
        (SELECT UNNEST($1::text[]) as id,
                UNNEST($2::varchar[]) as username,
                UNNEST($3::varchar[]) as first_name,
                UNNEST($4::varchar[]) as last_name,
                UNNEST($5::text[]) as image_url,
                UNNEST($6::boolean[]) as password_enabled,
                UNNEST($7::boolean[]) as two_factor_enabled,
                UNNEST($8::boolean[]) as backup_code_enabled,
                UNNEST($9::BIGINT[]) as created_at,
                UNNEST($10::BIGINT[]) as updated_at)
     ON CONFLICT (id) 
     DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        image_url = EXCLUDED.image_url,
        password_enabled = EXCLUDED.password_enabled,
        two_factor_enabled = EXCLUDED.two_factor_enabled,
        backup_code_enabled = EXCLUDED.backup_code_enabled,
        updated_at = EXCLUDED.updated_at`;

const UPSERT_EMAIL_ADDRESSES_QUERY = 
    `INSERT INTO email_addresses (id, user_id, email_address)
     SELECT 
        id,
        user_id,
        email_address
     FROM 
        (SELECT UNNEST($1::text[]) as id,
                UNNEST($2::text[]) as user_id,
                UNNEST($3::varchar[]) as email_address)
     ON CONFLICT (id) 
     DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        email_address = EXCLUDED.email_address`;

const DELETE_USERS_BY_IDS_QUERY = 
    `DELETE FROM users WHERE id = ANY($1)`;

export {
    CREATE_VERSION_TABLE_QUERY,
    GET_SCHEMA_VERSION_QUERY,
    UPDATE_SCHEMA_VERSION_QUERY,
    CREATE_USERS_TABLE_QUERY,
    CREATE_EMAIL_ADDRESSES_TABLE_QUERY,
    CREATE_USERS_USERNAME_INDEX,
    CREATE_EMAIL_ADDRESSES_USER_ID_INDEX,
    CREATE_EMAIL_ADDRESSES_EMAIL_INDEX,
    COUNT_USERS_QUERY,
    GET_USERS_QUERY,
    GET_USERS_BY_IDS_QUERY,
    GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY,
    GET_LATEST_USER_UPDATE_QUERY,
    UPSERT_USERS_QUERY,
    UPSERT_EMAIL_ADDRESSES_QUERY,
    DELETE_USERS_BY_IDS_QUERY
};