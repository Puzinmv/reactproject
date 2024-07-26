import React, { useState, useEffect } from 'react';
import { Box, Button, List, ListItem, ListItemText } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { GetfilesInfo } from '../services/directus';

const FileUpload = ({ files, token, onUpload, onDelete }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [fileInfo, setfileInfo] = useState([]);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };
    useEffect(() => {
        GetfilesInfo(files).then((file) => {
            console.log(file)
            setfileInfo(file)
        });

    }, [files]);
    

    const handleDownload = (file) => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.click();
    };
    return (
        <Box>
            <List>
                {fileInfo.map((file, index) => (
                    <ListItem key={index} secondaryAction={
                        <>
                            <Button onClick={(event) => handleDownload(file)}>Скачать</Button>
                        </>
                    }>
                        <ListItemText primary={file.filename_download} />
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
