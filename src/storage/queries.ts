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
        username VARCHAR(255) UNIQUE,
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


const CREATE_ADDRESSES_TABLE_QUERY =
`CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city VARCHAR(255) NOT NULL,
    province VARCHAR(255),
    postal_code VARCHAR(64),
    country VARCHAR(64) NOT NULL
)`;

const CREATE_USERS_USERNAME_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`;

const CREATE_EMAIL_ADDRESSES_USER_ID_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_email_addresses_user_id ON email_addresses(user_id)`;

const CREATE_EMAIL_ADDRESSES_EMAIL_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_email_addresses_email ON email_addresses(email_address)`;

const CREATE_ADDRESSES_USER_ID_INDEX =
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_user_id ON addresses(user_id)`;

const MIGRATE_ADD_PHONE_AND_LANGUAGES_QUERY = `
    ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_number TEXT,
        ADD COLUMN IF NOT EXISTS languages JSONB NOT NULL DEFAULT '[]' ;
    `;

const COUNT_USERS_QUERY =
    `SELECT COUNT(*) as total 
     FROM users 
     WHERE $1::BIGINT IS NULL OR updated_at > to_timestamp($1::BIGINT/1000.0)`;

const GET_USERS_QUERY =
    `SELECT u.id, u.username, u.first_name, u.last_name, u.image_url, u.phone_number, u.languages,
            u.password_enabled, u.two_factor_enabled, u.backup_code_enabled,
            u.created_at, u.updated_at
     FROM users u
     WHERE ($1::BIGINT IS NULL OR u.updated_at > to_timestamp($1::BIGINT/1000.0))
     ORDER BY u.updated_at DESC
     LIMIT $2 OFFSET $3`;

const GET_USERS_BY_IDS_QUERY = 
    `SELECT u.id, u.username, u.first_name, u.last_name, u.image_url, u.phone_number, u.languages,
            u.password_enabled, u.two_factor_enabled, u.backup_code_enabled,
            u.created_at, u.updated_at
     FROM users u
     WHERE u.id = ANY($1)
     ORDER BY u.updated_at DESC`;

const GET_USER_BY_USERNAME_QUERY = 
    `SELECT u.id, u.username, u.first_name, u.last_name, u.image_url, u.phone_number, u.languages,
            u.password_enabled, u.two_factor_enabled, u.backup_code_enabled,
            u.created_at, u.updated_at
     FROM users u
     WHERE u.username = $1`;

const GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY = 
    `SELECT id, user_id, email_address 
     FROM email_addresses 
     WHERE user_id = ANY($1)
     ORDER BY user_id`;

const GET_ADDRESSES_BY_USER_IDS_QUERY = 
    `SELECT id, user_id, line1, line2, city, province, postal_code, country
     FROM addresses
     WHERE user_id = ANY($1)
     ORDER BY user_id`;

const GET_LATEST_USER_UPDATE_QUERY = 
    `SELECT MAX(updated_at) as latest_update FROM users`;

const UPSERT_USERS_QUERY = `
INSERT INTO users (
  id, username, first_name, last_name, image_url, phone_number, languages,
  password_enabled, two_factor_enabled, backup_code_enabled, created_at, updated_at
)
SELECT
  id, username, first_name, last_name, image_url, phone_number, languages_json::jsonb AS languages,
  password_enabled, two_factor_enabled, backup_code_enabled,
  to_timestamp(created_at::BIGINT/1000.0),
  to_timestamp(updated_at::BIGINT/1000.0)
FROM (
  SELECT
    UNNEST($1::text[])       AS id,
    UNNEST($2::varchar[])    AS username,
    UNNEST($3::varchar[])    AS first_name,
    UNNEST($4::varchar[])    AS last_name,
    UNNEST($5::text[])       AS image_url,
    UNNEST($6::text[])       AS phone_number,
    UNNEST($7::text[])       AS languages_json,   -- each element is a JSON string like '["english","mandarin"]'
    UNNEST($8::boolean[])    AS password_enabled,
    UNNEST($9::boolean[])    AS two_factor_enabled,
    UNNEST($10::boolean[])   AS backup_code_enabled,
    UNNEST($11::BIGINT[])    AS created_at,
    UNNEST($12::BIGINT[])    AS updated_at
) AS t
ON CONFLICT (id) DO UPDATE
SET
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  image_url = EXCLUDED.image_url,
  phone_number = EXCLUDED.phone_number,
  languages = EXCLUDED.languages,
  password_enabled = EXCLUDED.password_enabled,
  two_factor_enabled = EXCLUDED.two_factor_enabled,
  backup_code_enabled = EXCLUDED.backup_code_enabled,
  updated_at = EXCLUDED.updated_at;
`;

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

const UPSERT_ADDRESS_QUERY =
    `INSERT INTO addresses (id, user_id, line1, line2, city, province, postal_code, country)
     SELECT 
        id,
        user_id,
        line1,
        line2,
        city,
        province,
        postal_code,
        country
     FROM 
        (SELECT UNNEST($1::text[]) as id,
                UNNEST($2::text[]) as user_id,
                UNNEST($3::text[]) as line1,
                UNNEST($4::text[]) as line2,
                UNNEST($5::varchar[]) as city,
                UNNEST($6::varchar[]) as province,
                UNNEST($7::varchar[]) as postal_code,
                UNNEST($8::varchar[]) as country)
     ON CONFLICT (user_id) 
     DO UPDATE SET 
        line1 = EXCLUDED.line1,
        line2 = EXCLUDED.line2,
        city = EXCLUDED.city,
        province = EXCLUDED.province,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country`;

const DELETE_USERS_BY_IDS_QUERY = 
    `DELETE FROM users WHERE id = ANY($1)`;

const CREATE_CONNECTION_REQUESTS_TABLE_QUERY =
    `CREATE TABLE IF NOT EXISTS connection_requests (
        request_id     SERIAL PRIMARY KEY,
        requester_id   TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requester_username VARCHAR(255),
        requester_first_name VARCHAR(255),
        requester_last_name VARCHAR(255),
        requester_image_url TEXT,
        receiver_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_username VARCHAR(255),
        receiver_first_name VARCHAR(255),
        receiver_last_name VARCHAR(255),
        receiver_image_url TEXT,
        greeting_text  TEXT    NULL,                                                
        status         VARCHAR(10) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','rejected','canceled')),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        responded_at   TIMESTAMPTZ
    )`;

//-- Prevent multiple simultaneous pending requests between the same pair
const CREATE_CONNECTION_REQUESTS_PAIR_INDEX_QUERY =
    `CREATE UNIQUE INDEX uq_connection_requests_pair
        ON connection_requests (
            LEAST(requester_id, receiver_id),
            GREATEST(requester_id, receiver_id)
        )
    WHERE status = 'pending'`;

// -- Disallow sending a request to oneself
const ADD_NO_SELF_REQUESTS_CHECK_QUERY =
    `ALTER TABLE connection_requests
    ADD CONSTRAINT chk_no_self_request
    CHECK (requester_id <> receiver_id);`;

const CREATE_CONNECTIONS_TABLE_QUERY = 
    `CREATE TABLE IF NOT EXISTS connections (
        connection_id  SERIAL PRIMARY KEY,
        user_id1       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_id1_username VARCHAR(255),
        user_id1_first_name VARCHAR(255),
        user_id1_last_name VARCHAR(255),
        user_id1_image_url TEXT,
        user_id2       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_id2_username VARCHAR(255),
        user_id2_first_name VARCHAR(255),
        user_id2_last_name VARCHAR(255),
        user_id2_image_url TEXT,
        connected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

// -- Enforce user_id1 < user_id2 so each mutual pair is stored only once
const ADD_USER_ORDER_CHECK_QUERY =
    `ALTER TABLE connections
        ADD CONSTRAINT chk_user_order
        CHECK (user_id1 < user_id2)`;

//-- Each distinct unordered pair appears exactly once
const CREATE_UNIQUE_CONNECTIONS_PAIR_INDEX_QUERY =
    `CREATE UNIQUE INDEX uq_connections_pair
        ON connections (user_id1, user_id2)`;

const GET_CONNECTION_REQUESTS_BY_USER_ID_QUERY =
    `SELECT request_id, requester_id, requester_username, requester_first_name, requester_last_name, requester_image_url, receiver_id, receiver_username, receiver_first_name, receiver_last_name, receiver_image_url, greeting_text, status, created_at, responded_at
     FROM connection_requests
     WHERE requester_id = $1 OR receiver_id = $1
     ORDER BY created_at DESC`;

const ADD_CONNECTION_REQUEST_QUERY =
    `INSERT INTO connection_requests (requester_id, requester_username, requester_first_name, requester_last_name, requester_image_url, receiver_id, receiver_username, receiver_first_name, receiver_last_name, receiver_image_url, greeting_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING request_id, requester_id, requester_username, requester_first_name, requester_last_name, requester_image_url, receiver_id, receiver_username, receiver_first_name, receiver_last_name, receiver_image_url, greeting_text, status, created_at, responded_at`;

// Update connection request status from pending -> canceled (only requester can cancel)
const UPDATE_CONNECTION_REQUEST_TO_CANCELED_QUERY =
    `UPDATE connection_requests 
     SET status = 'canceled', responded_at = NOW()
     WHERE request_id = $1 
       AND requester_id = $2 
       AND status = 'pending'
     RETURNING request_id, requester_id, requester_username, requester_first_name, requester_last_name, requester_image_url, receiver_id, receiver_username, receiver_first_name, receiver_last_name, receiver_image_url, greeting_text, status, created_at, responded_at`;

// Update connection request status from pending -> accepted/rejected (only receiver can accept/reject)
const UPDATE_CONNECTION_REQUEST_STATUS_BY_RECEIVER_QUERY =
    `UPDATE connection_requests 
     SET status = $3, responded_at = NOW()
     WHERE request_id = $1 
       AND receiver_id = $2 
       AND status = 'pending'
     RETURNING request_id, requester_id, requester_username, requester_first_name, requester_last_name, requester_image_url, receiver_id, receiver_username, receiver_first_name, receiver_last_name, receiver_image_url, greeting_text, status, created_at, responded_at`;

const DELETE_CONNECTION_REQUEST_QUERY =
    `DELETE FROM connection_requests
     WHERE request_id = $1`;

const GET_CONNECTION_BY_ID_QUERY =
    `SELECT connection_id, user_id1, user_id1_username, user_id1_first_name, user_id1_last_name, user_id1_image_url, user_id2, user_id2_username, user_id2_first_name, user_id2_last_name, user_id2_image_url, connected_at
     FROM connections
     WHERE connection_id = $1
     LIMIT 1`;

const GET_CONNECTION_BY_USER_IDS_PAIR_QUERY =
    `SELECT connection_id, user_id1, user_id1_username, user_id1_first_name, user_id1_last_name, user_id1_image_url, user_id2, user_id2_username, user_id2_first_name, user_id2_last_name, user_id2_image_url, connected_at
     FROM connections
     WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)
     LIMIT 1`;

const GET_CONNECTIONS_BY_USER_ID_QUERY = 
    `SELECT connection_id, user_id1, user_id1_username, user_id1_first_name, user_id1_last_name, user_id1_image_url, user_id2, user_id2_username, user_id2_first_name, user_id2_last_name, user_id2_image_url, connected_at
     FROM connections
     WHERE user_id1 = $1 OR user_id2 = $1
     ORDER BY connected_at DESC`;

const ADD_CONNECTION_QUERY =
    `INSERT INTO connections (user_id1, user_id1_username, user_id1_first_name, user_id1_last_name, user_id1_image_url, user_id2, user_id2_username, user_id2_first_name, user_id2_last_name, user_id2_image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING connection_id, user_id1, user_id1_username, user_id1_first_name, user_id1_last_name, user_id1_image_url, user_id2, user_id2_username, user_id2_first_name, user_id2_last_name, user_id2_image_url, connected_at`;

const DELETE_CONNECTION_BY_ID_QUERY =
    `DELETE FROM connections
     WHERE connection_id = $1
     RETURNING connection_id, user_id1, user_id1_username, user_id1_first_name, user_id1_last_name, user_id1_image_url, user_id2, user_id2_username, user_id2_first_name, user_id2_last_name, user_id2_image_url, connected_at`;
     
export {
    CREATE_VERSION_TABLE_QUERY,
    GET_SCHEMA_VERSION_QUERY,
    UPDATE_SCHEMA_VERSION_QUERY,
    CREATE_USERS_TABLE_QUERY,
    CREATE_EMAIL_ADDRESSES_TABLE_QUERY,
    CREATE_ADDRESSES_TABLE_QUERY,
    CREATE_USERS_USERNAME_INDEX,
    CREATE_EMAIL_ADDRESSES_USER_ID_INDEX,
    CREATE_EMAIL_ADDRESSES_EMAIL_INDEX,
    CREATE_ADDRESSES_USER_ID_INDEX,
    MIGRATE_ADD_PHONE_AND_LANGUAGES_QUERY,
    COUNT_USERS_QUERY,
    GET_USERS_QUERY,
    GET_USERS_BY_IDS_QUERY,
    GET_USER_BY_USERNAME_QUERY,
    GET_EMAIL_ADDRESSES_BY_USER_IDS_QUERY,
    GET_ADDRESSES_BY_USER_IDS_QUERY,
    GET_LATEST_USER_UPDATE_QUERY,
    UPSERT_USERS_QUERY,
    UPSERT_EMAIL_ADDRESSES_QUERY,
    UPSERT_ADDRESS_QUERY,
    DELETE_USERS_BY_IDS_QUERY,
    CREATE_CONNECTION_REQUESTS_TABLE_QUERY,
    CREATE_CONNECTIONS_TABLE_QUERY,
    CREATE_CONNECTION_REQUESTS_PAIR_INDEX_QUERY,
    ADD_NO_SELF_REQUESTS_CHECK_QUERY,
    ADD_USER_ORDER_CHECK_QUERY,
    CREATE_UNIQUE_CONNECTIONS_PAIR_INDEX_QUERY,
    GET_CONNECTION_REQUESTS_BY_USER_ID_QUERY,
    ADD_CONNECTION_REQUEST_QUERY,
    UPDATE_CONNECTION_REQUEST_TO_CANCELED_QUERY,
    UPDATE_CONNECTION_REQUEST_STATUS_BY_RECEIVER_QUERY,
    DELETE_CONNECTION_REQUEST_QUERY,
    GET_CONNECTION_BY_ID_QUERY,
    GET_CONNECTION_BY_USER_IDS_PAIR_QUERY,
    GET_CONNECTIONS_BY_USER_ID_QUERY,
    ADD_CONNECTION_QUERY,
    DELETE_CONNECTION_BY_ID_QUERY
};