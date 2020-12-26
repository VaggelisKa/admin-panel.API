import { RoleOptions, Provider } from '../types/types.ts'

export const insertUserString = (
  username: string,
  email: string,
  password: string,
  facebook_id?: string,
  google_id?: string
) => {
  if (facebook_id) {
    return `INSERT INTO users(username, email, password, facebook_id) VALUES('${username}', '${email}', '${password}', '${facebook_id}') 
            RETURNING id, username, email, token_version, facebook_id, google_id, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at, 
            reset_password_token, reset_password_token_expiry, ARRAY_TO_JSON(roles) roles;`
  }

  if (google_id) {
    return `INSERT INTO users(username, email, password, google_id) VALUES('${username}', '${email}', '${password}', '${google_id}') 
            RETURNING id, username, email, token_version, facebook_id, google_id, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') 
            created_at, reset_password_token, reset_password_token_expiry, ARRAY_TO_JSON(roles) roles;`
  }

  return `INSERT INTO users(username, email, password) VALUES('${username}', '${email}', '${password}') 
          RETURNING id, username, email, token_version, facebook_id, google_id, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') 
          created_at, reset_password_token, reset_password_token_expiry, ARRAY_TO_JSON(roles) roles;`
}

export const queryUsersString = () => {
  return `SELECT id, username, email, password, token_version, facebook_id, google_id, ARRAY_TO_JSON(roles) roles, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') 
          created_at, reset_password_token, reset_password_token_expiry FROM users ORDER BY created_at DESC;`
}

export const queryByIdString = (id: string) => {
  return `SELECT id, username, email, password, token_version, facebook_id, google_id, ARRAY_TO_JSON(roles) roles,  TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') 
          created_at, reset_password_token, reset_password_token_expiry FROM users WHERE id = '${id}';`
}

export const queryByEmailString = (email: string): string => {
  return `SELECT id, username, email, password, token_version, facebook_id, google_id, ARRAY_TO_JSON(roles) roles,  TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') 
          created_at, reset_password_token, reset_password_token_expiry FROM users WHERE email = '${email}';`
}

export const queryByResetPasswordTokenString = (token: string) => {
  return `SELECT id, username, email, password, token_version, facebook_id, google_id, ARRAY_TO_JSON(roles) roles,  TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') 
          created_at, reset_password_token, reset_password_token_expiry FROM users WHERE reset_password_token = '${token}';`
}

export const queryByProviderIdString = (id: string, provider: Provider) => {
  if (provider === Provider.facebook) {
    return `SELECT id, username, email, password, token_version, facebook_id, google_id, ARRAY_TO_JSON(roles) roles,  
            TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at, reset_password_token, reset_password_token_expiry FROM users WHERE facebook_id = '${id}';`
  } else if (provider === Provider.google) {
    return `SELECT id, username, email, password, token_version, facebook_id, google_id, ARRAY_TO_JSON(roles) roles,  
            TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at, reset_password_token, reset_password_token_expiry FROM users WHERE google_id = '${id}';`
  } else {
    return `SELECT id, username, email, password, token_version, facebook_id, google_id, ARRAY_TO_JSON(roles) roles,  
            TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at, reset_password_token, reset_password_token_expiry FROM users WHERE id = '${id}';`
  }
}

export const updateTokenVersionString = (id: string, tokenVersion: number) => {
  return `UPDATE users SET token_version = ${tokenVersion} WHERE id = '${id}' RETURNING id, username, email, token_version, ARRAY_TO_JSON(roles) roles;`
}

export const updateRequestResetPasswordString = (
  email: string,
  resetToken: string,
  resetTokenExpiry: number
) => {
  return `UPDATE users SET reset_password_token = '${resetToken}', reset_password_token_expiry = '${resetTokenExpiry}' WHERE email = '${email}' 
          RETURNING id, email, token_version,reset_password_token, reset_password_token_expiry;`
}

export const updateResetPasswordString = (id: string, password: string) => {
  return `UPDATE users SET password = '${password}', reset_password_token = NULL, reset_password_token_expiry = NULL 
          WHERE id = '${id}' RETURNING id, email,reset_password_token, reset_password_token_expiry;`
}

export const updateRolesString = (id: string, roles: RoleOptions[]) => {
  let queryString = ''

  const updatedRoles = roles.filter(
    (role) =>
      role !== RoleOptions.client &&
      (role === RoleOptions.admin ||
        role === RoleOptions.itemEditor ||
        role === RoleOptions.superAdmin)
  )

  if (updatedRoles.length === 0) {
    queryString = `UPDATE users SET roles = ARRAY ['CLIENT'] WHERE id = '${id}' 
                   RETURNING id, username, email, token_version, ARRAY_TO_JSON(roles) roles, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at;`
  } else {
    if (updatedRoles.length === 1) {
      queryString = `UPDATE users SET roles = ARRAY ['CLIENT', '${updatedRoles[0]}'] WHERE id = '${id}' 
                     RETURNING id, username, email, token_version, ARRAY_TO_JSON(roles) roles, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at;`
    } else if (updatedRoles.length === 2) {
      queryString = `UPDATE users SET roles = ARRAY ['CLIENT', '${updatedRoles[0]}', '${updatedRoles[1]}'] WHERE id = '${id}' 
                     RETURNING id, username, email, token_version, ARRAY_TO_JSON(roles) roles, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at;`
    } else if (updatedRoles.length === 3) {
      queryString = `UPDATE users SET roles = ARRAY ['CLIENT', '${updatedRoles[0]}', '${updatedRoles[1]}', '${updatedRoles[2]}'] 
                     WHERE id = '${id}' RETURNING id, username, email, token_version, ARRAY_TO_JSON(roles) roles, TO_CHAR(created_at, 'MON-DD-YYYY HH12:MIPM') created_at;`
    }
  }

  return queryString
}

export const deleteUserByIdString = (id: string) => {
  return `DELETE FROM users WHERE id = '${id}';`
}
