import React, { useState } from 'react';
import { Box, Button, List, ListItem, ListItemText, Menu, MenuItem } from '@mui/material';
import { CloudUpload, MoreVert } from '@mui/icons-material';

const FileUpload = ({ files, onUpload, onDelete }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleDownload = (file) => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.click();
    };
    return (
        <Box>
            <List>
                {files.map((file, index) => (
                    <ListItem key={index} secondaryAction={
                        <>
                            <Button onClick={(event) => handleDownload(file)}>Скачать</Button>
                            <MoreVert onClick={handleClick} />
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                <MenuItem onClick={() => handleDownload(file)}>Скачать файл</MenuItem>
                            </Menu>
                        </>
                    }>
                        <ListItemText primary={file.name} />
                    </ListItem>
                ))}
            </List>
            <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
            >
                Загрузить файл
                <input
                    type="file"
                    hidden
                    onChange={(e) => onUpload(e.target.files[0])}
                />
            </Button>
        </Box>
    );
};

export default FileUpload;
