import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:3000'

function SignupPage({ onAuthSuccess }) {
    const navigate = useNavigate()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')

        if (!fullName.trim() || !email.trim() || !password || !dateOfBirth) {
            setError('Please fill all required fields')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    email: email.trim(),
                    password,
                    dateOfBirth
                })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Signup failed')
            }

            if (onAuthSuccess) {
                onAuthSuccess(data.data)
            }

            navigate('/')
        } catch (err) {
            setError(err.message || 'Signup failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="page auth-page">
            <section className="auth-card">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Sign up with your full profile details.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label htmlFor="fullName">Full Name</label>
                    <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                    />

                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={6}
                    />

                    <label htmlFor="dob">Date of Birth</label>
                    <input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(event) => setDateOfBirth(event.target.value)}
                        required
                    />

                    {error && <p className="status error">{error}</p>}

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </section>
        </main>
    )
}

export default SignupPage
