import * as React from 'react';
import {
    AppBar, Box, Toolbar, IconButton, Typography, Menu,
    Container, Avatar, Button, Tooltip, MenuItem
} from '@mui/material';

const pages = ['Карта проекта'];
const settings = ['Профиль', 'Выйти'];

function ResponsiveAppBar({ handleLogout, current }) {
  const [setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);


  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
    return (
        <AppBar position="static">
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <image src = '../../public/logo.png' />
                    <Typography
                        variant="h6"
                        noWrap
                        sx={{
                            mr: 2,
                            display: { xs: 'none', md: 'flex' },
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.3rem',
                            color: 'inherit',
                            textDecoration: 'none',
                        }}
                    >
                        Астерит
                    </Typography>

                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                        {pages.map((page) => (
                            <Button
                                key={page}
                                onClick={handleCloseNavMenu}
                                sx={{ my: 2, color: 'white', display: 'block' }}
                            >
                                {page}
                            </Button>
                        ))}
                    </Box>
                    {(Object.keys(current).length > 0) && (
                        <Box sx={{ flexGrow: 0 }}>
                            <Tooltip title={`${current.first_name} ${current.last_name}`}>
                            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                    <Avatar alt={`${current.first_name} ${current.last_name}`} src="" />
                            </IconButton>
                            </Tooltip>
                                <Menu
                                    sx={{ mt: '45px' }}
                                    id="menu-appbar"
                                    anchorEl={anchorElUser}
                                    anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                    }}
                                    keepMounted
                                    transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                    }}
                                    open={Boolean(anchorElUser)}
                                    onClose={handleCloseUserMenu}
                                >
                                    {settings.map((setting) => (
                                        <MenuItem key={setting}
                                            onClick={handleLogout}
                                        >
                                        <Typography textAlign="center">{setting}</Typography>
                                    </MenuItem>
                                    ))}
                                </Menu>
                        </Box>
                    )}
                </Toolbar>
            </Container>
        </AppBar>
  );
}
export default ResponsiveAppBar;