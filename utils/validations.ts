export const validateUsername = (username: string) =>
  username.length >= 3 && username.length <= 30

export const validateEmail = (email: string) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

  return emailRegex.test(email)
}

export const validatePassword = (password: string) =>
  password.length >= 6 && password.length <= 300

export const validateProviderToken = (expiresIn: number) =>
  Date.now() < expiresIn
