import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import './SearchBar.css';

const SearchBar = ({ value, onChange, placeholder = 'Поиск' }) => {
    return (
        <TextField
            className="phonebook-search-bar"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    </InputAdornment>
                ),
            }}
            sx={{
                '& .MuiOutlinedInput-root': {
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#9D4EDD',
                    },
                },
                '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                    opacity: 1,
                },
            }}
        />
    );
};

export default SearchBar;
