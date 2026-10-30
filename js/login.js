const CLIENT_ID = '942049913091-c62geigvnamqanteqsa9lf70db8brfo0.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let accessToken = null;

export function setupLogin(onToken) {
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('google-login');

    if(typeof google === 'undefined'){
        errorEl.textContent = 'Google sign-in library failed to load.';
        return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async(resp) => {
            if(resp.error) {
                errorEl.textContent='Login failed: ' + resp.error;
                return;
            }
            errorEl.textContent = '';

            accessToken = resp.access_token;

            try {
                await onToken(resp.access_token);
            }catch(err){
                console.error(err);
                errorEl.textContent = 'Failed to load data: ' + err.message;

            }
        },
        error_callback: (err) => {
            errorEl.textContent = 'Sign-in popup was closed or blocked';
        }
    });

    btn.addEventListener('click', () =>{
        tokenClient.requestAccessToken({prompt: 'select_account'});
    });
}

export function logout(){
    if(accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => location.reload());    
    } else {
        location.reload();
    }
    accessToken = null;
}