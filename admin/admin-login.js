// Variable name change kiya hai taaki 'already declared' error na aaye
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Form Elements
const form = document.getElementById('admin-login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const errorAlert = document.getElementById('error-alert');
const errorText = document.getElementById('error-text');

// Password Visibility Toggle
const togglePasswordBtn = document.getElementById('toggle-password-btn');
togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    if (isPassword) {
        togglePasswordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
        togglePasswordBtn.setAttribute('aria-label', 'Hide password');
    } else {
        togglePasswordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        togglePasswordBtn.setAttribute('aria-label', 'Show password');
    }
});

function showError(message) {
    errorText.textContent = message;
    errorAlert.style.display = 'flex';
    errorAlert.style.animation = 'none';
    errorAlert.offsetHeight; // trigger reflow
    errorAlert.style.animation = 'shake 0.4s ease forwards';
}

// Handle Login Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) return;

    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        // Query using supabaseClient
        const { data, error } = await supabaseClient
            .from('admin')
            .select('id')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                showError("Invalid email or password.");
            } else {
                console.error("Supabase Error:", error);
                showError("Unable to sign in right now. Please try again.");
            }
        } else if (data) {
            sessionStorage.setItem('admin_authenticated', 'true');
            // Login ke baad admin-home.html par redirect karega
            window.location.href = 'admin-home.html';
            return; 
        }
    } catch (err) {
        console.error("Network Error:", err);
        showError("Unable to sign in right now. Please try again.");
    }

    submitBtn.disabled = false;
    btnText.style.display = 'inline-block';
    btnLoader.style.display = 'none';
});
