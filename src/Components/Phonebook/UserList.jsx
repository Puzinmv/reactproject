import React from 'react';
import { Box, Typography } from '@mui/material';
import './UserList.css';

const UserList = ({ users, onUserClick }) => {
    const formatFullName = (user) => {
        const parts = [];
        if (user.last_name) parts.push(user.last_name);
        if (user.first_name) parts.push(user.first_name);
        if (user.middle_name) parts.push(user.middle_name);
        return parts.join(' ') || 'Не указано';
    };

    return (
        <Box className="user-list">
            {users.map((user) => (
                <Box
                    key={user.id}
                    className="user-list-item"
                    onClick={() => onUserClick(user)}
                >
                    <Box className="user-photo-placeholder">
                        {user.avatar ? (
                            <img 
                                src={`${process.env.REACT_APP_API_URL}/assets/${user.avatar}?access_token=${localStorage.getItem('directus_token') || ''}`}
                                alt={formatFullName(user)}
                                className="user-photo"
                            />
                        ) : (
                            <Typography variant="body2" className="photo-placeholder-text">
                                ФОТО
                            </Typography>
                        )}
                    </Box>
                    <Box className="user-info">
                        <Typography variant="body1" className="user-name">
                            {formatFullName(user)}
                        </Typography>
                        <Typography variant="body2" className="user-position">
                            {user.title || 'Должность не указана'}
                        </Typography>
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default UserList;
