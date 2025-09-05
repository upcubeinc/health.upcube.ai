const pool = require('../db/connection');

async function createUser(userId, email, hashedPassword, full_name) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start transaction for atomicity

    // Insert into auth.users
    await client.query(
      'INSERT INTO auth.users (id, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, now(), now())',
      [userId, email, hashedPassword]
    );

    // Insert into profiles
    await client.query(
      'INSERT INTO profiles (id, full_name, created_at, updated_at) VALUES ($1, $2, now(), now())',
      [userId, full_name]
    );

    // Insert into user_goals
    await client.query(
      'INSERT INTO user_goals (user_id, created_at, updated_at) VALUES ($1, now(), now())',
      [userId]
    );

    await client.query('COMMIT'); // Commit transaction
    return userId;
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    throw error;
  } finally {
    client.release();
  }
}

async function findUserByEmail(email) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, password_hash, role, oidc_sub FROM auth.users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function findUserById(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, email, role, created_at FROM auth.users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function findUserIdByEmail(email) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function generateApiKey(userId, newApiKey, description) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO user_api_keys (user_id, api_key, description, permissions, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now()) RETURNING id, api_key, description, created_at, is_active`,
      [userId, newApiKey, description, { health_data_write: true }] // Default permission
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function deleteApiKey(apiKeyId, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
      [apiKeyId, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function getAccessibleUsers(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         fa.owner_user_id AS user_id,
         p.full_name,
         au.email AS email,
         fa.access_permissions AS permissions,
         fa.access_end_date
       FROM family_access fa
       JOIN profiles p ON p.id = fa.owner_user_id
       JOIN auth.users au ON au.id = fa.owner_user_id
       WHERE fa.family_user_id = $1
         AND fa.is_active = TRUE
         AND (fa.access_end_date IS NULL OR fa.access_end_date > NOW())`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getUserProfile(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, full_name, phone_number, TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, bio, avatar_url FROM profiles WHERE id = $1`,
      [userId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function updateUserProfile(userId, full_name, phone_number, date_of_birth, bio, avatar_url) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE profiles
       SET full_name = COALESCE($2, full_name),
           phone_number = COALESCE($3, phone_number),
           date_of_birth = COALESCE($4, date_of_birth),
           bio = COALESCE($5, bio),
           avatar_url = COALESCE($6, avatar_url),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [userId, full_name, phone_number, date_of_birth, bio, avatar_url]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getUserApiKeys(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, description, api_key, created_at, last_used_at, is_active FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function updateUserPassword(userId, hashedPassword) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE auth.users SET password_hash = $1, updated_at = now() WHERE id = $2 RETURNING id',
      [hashedPassword, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function updateUserEmail(userId, newEmail) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE auth.users SET email = $1, updated_at = now() WHERE id = $2 RETURNING id',
      [newEmail, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function getUserRole(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT role FROM auth.users WHERE id = $1',
      [userId]
    );
    return result.rows[0] ? result.rows[0].role : null;
  } finally {
    client.release();
  }
}

module.exports = {
  createUser,
  createOidcUser,
  findUserByEmail,
  findUserById,
  findUserIdByEmail,
  generateApiKey,
  deleteApiKey,
  getAccessibleUsers,
  getUserProfile,
  updateUserProfile,
  getUserApiKeys,
  updateUserPassword,
  updateUserEmail,
  getUserRole,
  updateUserRole,
  updateUserOidcSub,
};

async function updateUserRole(userId, role) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE auth.users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id',
      [role, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function createOidcUser(userId, email, fullName, oidcSub) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert into auth.users for OIDC
    // For OIDC users, password_hash is not used, but the column requires a non-null value.
    // We insert a placeholder (e.g., an empty string) to satisfy the constraint.
    await client.query(
      'INSERT INTO auth.users (id, email, oidc_sub, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, now(), now())',
      [userId, email, oidcSub, '']
    );

    // Insert into profiles
    await client.query(
      'INSERT INTO profiles (id, full_name, created_at, updated_at) VALUES ($1, $2, now(), now())',
      [userId, fullName]
    );

    // Insert into user_goals
    await client.query(
      'INSERT INTO user_goals (user_id, created_at, updated_at) VALUES ($1, now(), now())',
      [userId]
    );

    await client.query('COMMIT');
    return userId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateUserOidcSub(userId, oidcSub) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE auth.users SET oidc_sub = $1, updated_at = now() WHERE id = $2 RETURNING id',
      [oidcSub, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}