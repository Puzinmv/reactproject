import React, { useState, useEffect, useCallback } from 'react';
import { getToken, loginEmail, loginAD, logout, getCurrentUser } from '../services/directus';
import LoginForm from './LoginForm';
import { CircularProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ResponsiveAppBar from './ResponsiveAppBar';
import { useLocation, useNavigate } from 'react-router-dom';

const theme = createTheme({
    typography: {
        fontFamily: 'Roboto, sans-serif',
    },
    components: {
        MuiTableRow: {
            styleOverrides: {
                root: {
                    "&.MuiTableRow-hover:hover": {
                        backgroundColor: '#cfe2f3',
                    },
                },
            },
        },
    },
});

function AuthWrapper({ children, isLoginFunc }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [savedSearchParams, setSavedSearchParams] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const redirectPath = new URLSearchParams(location.search).get('redirect');
    const authTheme = new URLSearchParams(location.search).get('authTheme');
    const isPhonebookAuthTheme = authTheme === 'phonebook' && redirectPath === '/phonebook';

    const checkAuthAndGetUser = useCallback(async () => {
        try {
            // РџСЂРѕРІРµСЂСЏРµРј С‚РѕРєРµРЅ
            try {
                await getToken();
            } catch (refreshError) {
                // Ignore and continue.
            }

            // РџРѕР»СѓС‡Р°РµРј РґР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
            const userData = await getCurrentUser();
            if (userData) {
                setCurrentUser(userData);
                if (redirectPath) {
                    navigate(redirectPath, { replace: true });
                    return true;
                }
                // Р’РѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј РїР°СЂР°РјРµС‚СЂС‹ URL РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕР№ Р°РІС‚РѕСЂРёР·Р°С†РёРё
                if (savedSearchParams && window.location.search === '') {
                    window.history.replaceState({}, '', savedSearchParams);
                }
                return true;
            }
        } catch (e) {
            console.error(e);
            setCurrentUser(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [navigate, redirectPath, savedSearchParams]);

    useEffect(() => {
        setSavedSearchParams(window.location.search);
        checkAuthAndGetUser();
    }, [checkAuthAndGetUser]);

    useEffect(() => {
        if (currentUser && savedSearchParams && window.location.search === '') {
            window.history.replaceState({}, '', savedSearchParams);
        }
    }, [savedSearchParams, currentUser]);

    const handleLogout = async () => {
        await logout();
        setCurrentUser(null);
    };

    const handleLogin = async (email, password, isAD) => {
        try {
            let loginResult;
            if (isAD) {
                loginResult = await loginAD(email, password);
            } else {
                loginResult = await loginEmail(email, password);
            }
            
            if (loginResult) {
                const userData = await getCurrentUser();
                if (userData) {
                    setCurrentUser(userData);
                    if (redirectPath) {
                        navigate(redirectPath, { replace: true });
                        return true;
                    }
                    if (savedSearchParams) {
                        window.history.replaceState({}, '', savedSearchParams);
                    }
                    isLoginFunc();
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    return (
        <ThemeProvider theme={theme}>
            {!isPhonebookAuthTheme ? <ResponsiveAppBar handleLogout={handleLogout} current={currentUser} /> : null}
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <CircularProgress />
                </div>
            ) : currentUser ? (
                children
            ) : (
                <LoginForm onLogin={handleLogin} isPhonebookTheme={isPhonebookAuthTheme} />
            )}
        </ThemeProvider>
    );
}

export default AuthWrapper; 
