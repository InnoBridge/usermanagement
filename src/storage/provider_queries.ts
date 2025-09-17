const CREATE_PROVIDERS_TABLE_QUERY = 
    `CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        providername VARCHAR(255) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        image_url TEXT NOT NULL,
        phone_number TEXT,
        languages JSONB NOT NULL DEFAULT '[]',
        password_enabled BOOLEAN NOT NULL DEFAULT false,
        two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
        backup_code_enabled BOOLEAN NOT NULL DEFAULT false,
        service_radius DOUBLE PRECISION NOT NULL,
        can_visit_client_home BOOLEAN NOT NULL DEFAULT false,
        virtual_help_offered BOOLEAN NOT NULL DEFAULT false,
        business_name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;


// Email addresses table queries
const CREATE_PROVIDER_EMAIL_ADDRESSES_TABLE_QUERY = 
    `CREATE TABLE IF NOT EXISTS provider_email_addresses (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        email_address VARCHAR(255) NOT NULL UNIQUE
    )`;


const CREATE_PROVIDER_ADDRESSES_TABLE_QUERY =
    `CREATE TABLE IF NOT EXISTS provider_addresses (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        place_id TEXT,                 -- google place_id (optional)
        name TEXT,                     -- use for display (place name / main text)
        unit_number TEXT,              -- subpremise / unit
        city VARCHAR(255) NOT NULL,
        province VARCHAR(255),         -- store full name or code (decide convention)
        postal_code VARCHAR(64),
        country VARCHAR(64) NOT NULL,  -- ISO alpha-2 recommended
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION
    )`;


const CREATE_PROVIDERS_PROVIDERNAME_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_providers_providername ON providers(providername) WHERE providername IS NOT NULL`;

const CREATE_PROVIDERS_BUSINESS_NAME_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_providers_business_name ON providers(business_name) WHERE business_name IS NOT NULL`;

const CREATE_PROVIDER_EMAIL_ADDRESSES_ID_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_provider_email_addresses_id ON provider_email_addresses(id)`;

const CREATE_PROVIDER_EMAIL_ADDRESSES_EMAIL_INDEX = 
    `CREATE INDEX IF NOT EXISTS idx_provider_email_addresses_email ON provider_email_addresses(email_address)`;

const CREATE_PROVIDER_ADDRESSES_PROVIDER_ID_INDEX =
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_addresses_provider_id ON provider_addresses(provider_id)`;

const CREATE_PROVIDER_ADDRESSES_PLACE_ID_INDEX =
    `CREATE INDEX IF NOT EXISTS idx_provider_addresses_place_id ON provider_addresses(place_id) WHERE place_id IS NOT NULL`;

const COUNT_PROVIDERS_QUERY =
    `SELECT COUNT(*) as total 
     FROM providers 
     WHERE $1::BIGINT IS NULL OR updated_at > to_timestamp($1::BIGINT/1000.0)`;

const GET_PROVIDERS_QUERY =
    `SELECT p.id, p.providername, p.first_name, p.last_name, p.image_url, p.phone_number, p.languages,
            p.password_enabled, p.two_factor_enabled, p.backup_code_enabled,
            p.service_radius, p.can_visit_client_home, p.virtual_help_offered, p.business_name,
            p.created_at, p.updated_at
     FROM providers p
     WHERE ($1::BIGINT IS NULL OR p.updated_at > to_timestamp($1::BIGINT/1000.0))
     ORDER BY p.updated_at DESC
     LIMIT $2 OFFSET $3`;

const GET_PROVIDERS_BY_IDS_QUERY = 
    `SELECT p.id, p.providername, p.first_name, p.last_name, p.image_url, p.phone_number, p.languages,
            p.service_radius, p.can_visit_client_home, p.virtual_help_offered, p.business_name,
            p.password_enabled, p.two_factor_enabled, p.backup_code_enabled,
            p.created_at, p.updated_at
     FROM providers p
     WHERE p.id = ANY($1)
     ORDER BY p.updated_at DESC`;

const GET_PROVIDER_BY_PROVIDERNAME_QUERY = 
    `SELECT p.id, p.providername, p.first_name, p.last_name, p.image_url, p.phone_number, p.languages,
            p.service_radius, p.can_visit_client_home, p.virtual_help_offered, p.business_name,
            p.password_enabled, p.two_factor_enabled, p.backup_code_enabled,
            p.created_at, p.updated_at
     FROM providers p
     WHERE p.providername = $1`;

const GET_PROVIDER_EMAIL_ADDRESSES_BY_PROVIDER_IDS_QUERY =
    `SELECT id, provider_id, email_address
     FROM provider_email_addresses
     WHERE provider_id = ANY($1)
     ORDER BY provider_id`;

const GET_PROVIDER_ADDRESSES_BY_PROVIDER_IDS_QUERY =
    `SELECT id, provider_id, place_id, name, unit_number, city, province, postal_code, country, lat, lng
     FROM provider_addresses
     WHERE provider_id = ANY($1)
     ORDER BY provider_id`;

const GET_LATEST_PROVIDER_UPDATE_QUERY = 
    `SELECT MAX(updated_at) as latest_update FROM providers`;

const UPSERT_PROVIDERS_QUERY = `
INSERT INTO providers (
  id, providername, first_name, last_name, image_url, phone_number, languages,
  password_enabled, two_factor_enabled, backup_code_enabled,
  service_radius, can_visit_client_home, virtual_help_offered, business_name,
  created_at, updated_at
)
SELECT
  id, providername, first_name, last_name, image_url, phone_number, languages_json::jsonb AS languages,
  password_enabled, two_factor_enabled, backup_code_enabled,
  service_radius, can_visit_client_home, virtual_help_offered, business_name,
  to_timestamp(created_at::BIGINT/1000.0),
  to_timestamp(updated_at::BIGINT/1000.0)
FROM (
  SELECT
    UNNEST($1::text[])       AS id,
    UNNEST($2::varchar[])    AS providername,
    UNNEST($3::varchar[])    AS first_name,
    UNNEST($4::varchar[])    AS last_name,
    UNNEST($5::text[])       AS image_url,
    UNNEST($6::text[])       AS phone_number,
    UNNEST($7::text[])       AS languages_json,
    UNNEST($8::boolean[])    AS password_enabled,
    UNNEST($9::boolean[])    AS two_factor_enabled,
    UNNEST($10::boolean[])   AS backup_code_enabled,
    UNNEST($11::double precision[]) AS service_radius,
    UNNEST($12::boolean[])   AS can_visit_client_home,
    UNNEST($13::boolean[])   AS virtual_help_offered,
    UNNEST($14::varchar[])   AS business_name,
    UNNEST($15::BIGINT[])    AS created_at,
    UNNEST($16::BIGINT[])    AS updated_at
) AS t
ON CONFLICT (id) DO UPDATE
SET
  providername = EXCLUDED.providername,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  image_url = EXCLUDED.image_url,
  phone_number = EXCLUDED.phone_number,
  languages = EXCLUDED.languages,
  password_enabled = EXCLUDED.password_enabled,
  two_factor_enabled = EXCLUDED.two_factor_enabled,
  backup_code_enabled = EXCLUDED.backup_code_enabled,
  service_radius = EXCLUDED.service_radius,
  can_visit_client_home = EXCLUDED.can_visit_client_home,
  virtual_help_offered = EXCLUDED.virtual_help_offered,
  business_name = EXCLUDED.business_name,
  updated_at = EXCLUDED.updated_at;
`;

const UPSERT_PROVIDER_EMAIL_ADDRESSES_QUERY =
    `INSERT INTO provider_email_addresses (id, provider_id, email_address)
    SELECT
        id,
        provider_id,
        email_address
    FROM 
        (SELECT UNNEST($1::text[]) AS id,
                UNNEST($2::text[]) AS provider_id,
                UNNEST($3::varchar[]) AS email_address)
    ON CONFLICT (id)
    DO UPDATE SET
        provider_id = EXCLUDED.provider_id,
        email_address = EXCLUDED.email_address`;

const UPSERT_PROVIDER_ADDRESSES_QUERY =
    `INSERT INTO provider_addresses (id, provider_id, place_id, name, unit_number, city, province, postal_code, country, lat, lng)
    SELECT
        id, provider_id, place_id, name, unit_number, city, province, postal_code, country, lat, lng
        FROM (
            SELECT UNNEST($1::text[]) AS id,
                   UNNEST($2::text[]) AS provider_id,
                   UNNEST($3::text[]) AS place_id,
                   UNNEST($4::text[]) AS name,
                   UNNEST($5::text[]) AS unit_number,
                   UNNEST($6::varchar[]) AS city,
                   UNNEST($7::varchar[]) AS province,
                   UNNEST($8::varchar[]) AS postal_code,
                   UNNEST($9::varchar[]) AS country,
                   UNNEST($10::double precision[]) AS lat,
                   UNNEST($11::double precision[]) AS lng
        ) AS t
    ON CONFLICT (provider_id) DO UPDATE
    SET
        place_id = EXCLUDED.place_id,
        name = EXCLUDED.name,
        unit_number = EXCLUDED.unit_number,
        city = EXCLUDED.city,
        province = EXCLUDED.province,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng`;

const DELETE_PROVIDERS_BY_IDS_QUERY = 
    `DELETE FROM providers WHERE id = ANY($1)`;

// Update your exports to include the new provider queries:
export {
    CREATE_PROVIDERS_TABLE_QUERY,
    CREATE_PROVIDER_EMAIL_ADDRESSES_TABLE_QUERY,
    CREATE_PROVIDER_ADDRESSES_TABLE_QUERY,
    CREATE_PROVIDERS_PROVIDERNAME_INDEX,
    CREATE_PROVIDERS_BUSINESS_NAME_INDEX,
    CREATE_PROVIDER_EMAIL_ADDRESSES_ID_INDEX,
    CREATE_PROVIDER_EMAIL_ADDRESSES_EMAIL_INDEX,
    CREATE_PROVIDER_ADDRESSES_PROVIDER_ID_INDEX,
    CREATE_PROVIDER_ADDRESSES_PLACE_ID_INDEX,
    COUNT_PROVIDERS_QUERY,
    GET_PROVIDERS_QUERY,
    GET_PROVIDERS_BY_IDS_QUERY,
    GET_PROVIDER_BY_PROVIDERNAME_QUERY,
    GET_PROVIDER_EMAIL_ADDRESSES_BY_PROVIDER_IDS_QUERY,
    GET_PROVIDER_ADDRESSES_BY_PROVIDER_IDS_QUERY,
    GET_LATEST_PROVIDER_UPDATE_QUERY,
    UPSERT_PROVIDERS_QUERY,
    UPSERT_PROVIDER_EMAIL_ADDRESSES_QUERY,
    UPSERT_PROVIDER_ADDRESSES_QUERY,
    DELETE_PROVIDERS_BY_IDS_QUERY
};