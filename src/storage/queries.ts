import { C } from "vitest/dist/chunks/reporters.d.C-cu31ET.js";

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

const CREATE_CONNECTION_REQUESTS_TABLE_QUERY =
    `CREATE TABLE connection_requests (
        request_id     SERIAL PRIMARY KEY,
        requester_id   TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        greeting_text  TEXT    NULL,                                                
        status         VARCHAR(10) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','rejected','canceled')),                                                                               -- state of the request
        created_at     TIMESTAMPTZ WITH TIME ZONE NOT NULL DEFAULT NOW(),
        responded_at   TIMESTAMPTZ WITH TIME ZONE
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
    `CREATE TABLE connections (
        connection_id  SERIAL PRIMARY KEY,                                         -- unique ID for each connection
        user_id1       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,     -- smaller user ID in the pair
        user_id2       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,     -- larger user ID in the pair
        connected_at   TIMESTAMPTZ WITH TIME ZONE NOT NULL DEFAULT NOW()              -- when the connection was established
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
    DELETE_USERS_BY_IDS_QUERY,
    CREATE_CONNECTION_REQUESTS_TABLE_QUERY,
    CREATE_CONNECTIONS_TABLE_QUERY,
    CREATE_CONNECTION_REQUESTS_PAIR_INDEX_QUERY,
    ADD_NO_SELF_REQUESTS_CHECK_QUERY,
    ADD_USER_ORDER_CHECK_QUERY,
    CREATE_UNIQUE_CONNECTIONS_PAIR_INDEX_QUERY
};