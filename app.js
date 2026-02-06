import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { SUPABASE_CONFIG } from './config.js'

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)

const currentPage = window.location.pathname.split('/').pop()

if (currentPage === 'login.html' || currentPage === '') {
    initLoginPage()
} else if (currentPage === 'dashboard.html') {
    initDashboardPage()
}

function initLoginPage() {
    const loginForm = document.getElementById('loginForm')
    const status = document.getElementById('status')

    checkIfLoggedIn()

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        status.textContent = 'Logging in...'

        const email = document.getElementById('email').value
        const password = document.getElementById('password').value

        try {
            status.textContent = 'Authenticating...'
            
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            })

            if (authError) {
                console.error('Auth error:', authError)
                throw new Error('Authentication failed: ' + authError.message)
            }

            status.textContent = 'Fetching user data...'
            console.log('Auth successful, fetching user data for:', email)

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('email_address', email)

            console.log('Query result:', { userData, userError })

            if (userError) {
                console.error('Database error:', userError)
                throw new Error('Database error: ' + userError.message + ' (Code: ' + userError.code + ')')
            }

            if (!userData || userData.length === 0) {
                throw new Error('No user found in database with email: ' + email)
            }

            if (userData.length > 1) {
                throw new Error('Multiple users found with same email')
            }

            const user = userData[0]
            localStorage.setItem('currentUser', JSON.stringify(user))
            
            status.textContent = 'Login successful! Redirecting...'
            status.style.color = 'green'
            
            setTimeout(() => {
                window.location.href = 'dashboard.html'
            }, 1000)

        } catch (error) {
            console.error('Login error:', error)
            status.textContent = 'Login failed: ' + error.message
            status.style.color = 'red'
        }
    })
}

function initDashboardPage() {
    const status = document.getElementById('status')
    const logoutBtn = document.getElementById('logoutBtn')

    const userJson = localStorage.getItem('currentUser')
    
    if (!userJson) {
        window.location.href = 'login.html'
        return
    }

    const user = JSON.parse(userJson)

    document.getElementById('userId').textContent = user.user_id || 'N/A'
    document.getElementById('userName').textContent = 
        `${user.given_name} ${user.middle_name || ''} ${user.last_name}`.trim()
    document.getElementById('userEmail').textContent = user.email_address || 'N/A'
    document.getElementById('userRole').textContent = user.role || 'N/A'
    document.getElementById('userProgram').textContent = user.program || 'N/A'
    document.getElementById('userYear').textContent = user.year || 'N/A'
    document.getElementById('userDepartment').textContent = user.department || 'N/A'

    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            status.textContent = 'Logout error: ' + error.message
            status.style.color = 'red'
        } else {
            localStorage.removeItem('currentUser')
            status.textContent = 'Logged out successfully!'
            status.style.color = 'green'
            
            setTimeout(() => {
                window.location.href = 'login.html'
            }, 1000)
        }
    })
}

async function checkIfLoggedIn() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
        window.location.href = 'dashboard.html'
    }
}
