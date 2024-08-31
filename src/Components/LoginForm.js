import React, { useState } from 'react';
import { TextField, Button, Box, Container, Typography, Alert, FormControlLabel, Switch } from '@mui/material';

const LoginForm = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [login, setLogin] = useState('');
    const [isADLogin, setisADLogin] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isSuccess = await onLogin(`${email}@asterit.ru`, password, false);
        if (!isSuccess) {
            setError('Неверный логин или пароль');
        } else {
            setError('');
        }
    };

    const handleSubmitAD = async (e) => {
        e.preventDefault();
        const isSuccess = await onLogin(login, password, true);
        if (!isSuccess) {
            setError('Неверный логин или пароль');
        } else {
            setError('');
        }
    };

    const handleEmailChange = (e) => {
        const value = e.target.value.replace('@asterit.ru', '');
        setEmail(value);
    };

    return (
        <Container maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '80vh' }}>            
            {isADLogin ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                        Авторизация AD
                    </Typography>
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    <Box
                        component="form"
                        onSubmit={handleSubmitAD}
                        sx={{ mt: 1, width: '100%' }}
                    >
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="AD login"
                            label="AD login"
                            name="AD login"
                            autoComplete="AD логин"
                            autoFocus
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Вход через AD
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                        Авторизация
                    </Typography>
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{ mt: 1, width: '100%' }}
                    >
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email адрес"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={handleEmailChange}
                            InputProps={{
                                endAdornment: (
                                    <Typography variant="body2">@asterit.ru</Typography>
                                )
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Вход
                        </Button>
                    </Box>
                </Box>
            )}
            <FormControlLabel
                control={
                    <Switch
                        checked={isADLogin}
                        name="isADLogin"
                        onChange={(e) => {
                            setisADLogin(e.target.checked)
                        }}
                    />
                }
                label={
                    <Typography variant="body1" color="textPrimary">
                        Авторизация через Active Directory
                    </Typography>
                }
                labelPlacement="end"
            />
        </Container>

    );
};

export default LoginForm;