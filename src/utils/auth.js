/**
 * Shared authentication utilities for all pages
 * Handles user authentication, redirects, and user info loading
 */

// Load user info and handle authentication
async function loadUserInfo() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const userData = await response.json();
            if (userData.user) {
                const name = userData.user.name || userData.user.email;
                const email = userData.user.email;
                
                // Update dropdown content if elements exist
                const userNameElement = document.getElementById('dropdownUserName');
                const userEmailElement = document.getElementById('dropdownUserEmail');
                const userDropdownElement = document.getElementById('userDropdown');
                
                if (userNameElement) {
                    // Add "Dr." prefix for clinician dashboard
                    const displayName = window.location.pathname.includes('clinician-dashboard') ? `Dr. ${name}` : name;
                    userNameElement.textContent = displayName;
                }
                
                if (userEmailElement) {
                    userEmailElement.textContent = email;
                }
                
                if (userDropdownElement) {
                    userDropdownElement.style.display = 'block';
                }
                
                // Update logout button onclick if it exists
                const logoutButtons = document.querySelectorAll('[onclick*="confirmLogout"]');
                logoutButtons.forEach(button => {
                    if (!button.onclick || button.onclick.toString().includes('confirmLogout')) {
                        button.onclick = confirmLogout;
                    }
                });
                
                return userData.user;
            }
        } else if (response.status === 401) {
            // User not authenticated, redirect to login
            const errorData = await response.json();
            if (errorData.loginUrl) {
                window.location.href = errorData.loginUrl;
            } else {
                window.location.href = '/login';
            }
        } else if (response.status === 403) {
            // User authenticated but access denied (wrong email domain)
            const errorData = await response.json();
            alert(errorData.error || 'Access denied. This application is restricted to @axi.ai email addresses only.');
            if (errorData.loginUrl) {
                window.location.href = errorData.loginUrl;
            } else {
                window.location.href = '/logout';
            }
        }
    } catch (error) {
        // User not authenticated, redirect to login
        window.location.href = '/login';
    }
    return null;
}

// User dropdown functionality
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

// Close dropdown when clicking outside
function setupDropdownCloseHandler() {
    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
        }
    });
}

// Logout confirmation with modal
function confirmLogout() {
    // Check if modal already exists
    let modal = document.getElementById('logoutModal');
    
    if (!modal) {
        // Create modal if it doesn't exist
        modal = createLogoutModal();
        document.body.appendChild(modal);
    }
    
    // Show modal
    modal.classList.add('show');
    
    // Close dropdown if it's open
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

// Create logout confirmation modal
function createLogoutModal() {
    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3 class="modal-title">Confirm Sign Out</h3>
            <p class="modal-text">Are you sure you want to sign out? You'll need to log in again to access the system.</p>
            <div class="modal-actions">
                <button class="modal-btn secondary" onclick="closeLogoutModal()">Cancel</button>
                <button class="modal-btn danger" onclick="performLogout()">Sign Out</button>
            </div>
        </div>
    `;
    
    // Add styles if they don't exist
    if (!document.getElementById('logoutModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'logoutModalStyles';
        styles.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }
            
            .modal {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .modal-overlay.show .modal {
                transform: scale(1);
            }
            
            .modal-title {
                font-size: 1.2rem;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 1rem;
            }
            
            .modal-text {
                color: #6b7280;
                margin-bottom: 2rem;
                line-height: 1.5;
            }
            
            .modal-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }
            
            .modal-btn {
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                font-size: 0.9rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            
            .modal-btn.secondary {
                background: #e5e7eb;
                color: #6b7280;
            }
            
            .modal-btn.secondary:hover {
                background: #d1d5db;
            }
            
            .modal-btn.danger {
                background: #ef4444;
                color: white;
            }
            
            .modal-btn.danger:hover {
                background: #dc2626;
            }
        `;
        document.head.appendChild(styles);
    }
    
    return modal;
}

// Close logout modal
function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Perform logout
function performLogout() {
    window.location.href = '/logout';
}

// Initialize authentication on page load
function initializeAuth() {
    // Load user info
    loadUserInfo();
    
    // Setup dropdown close handler
    setupDropdownCloseHandler();
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}

// Export functions for manual use if needed
window.authUtils = {
    loadUserInfo,
    toggleUserDropdown,
    confirmLogout,
    closeLogoutModal,
    performLogout,
    initializeAuth
};
