const AUTH_TOKEN_KEY = 'cb_auth_token'
const AUTH_USER_KEY = 'cb_auth_user'

export const getStoredAuth = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const rawUser = localStorage.getItem(AUTH_USER_KEY)

    if (!token || !rawUser) {
        return { token: null, user: null }
    }

    try {
        return {
            token,
            user: JSON.parse(rawUser)
        }
    } catch {
        return { token: null, user: null }
    }
}

export const setStoredAuth = (token, user) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export const clearStoredAuth = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
}

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY)
