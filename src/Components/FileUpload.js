import React from 'react';
import { Box, Button, List, ListItem, ListItemText, Grid } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { CloudUpload } from '@mui/icons-material';

const FileUpload = ({ files, onUpload, onDelete }) => {
    const handleDownload = (file) => {
        const link = document.createElement('a');
        link.href = `${process.env.REACT_APP_API_URL}/assets/${file.id}?download`;
        link.download = file.filename_download;
        link.click();
    };
    return (
        <Box>
            <List> 
                {files.map((file, index) => (
                    <ListItem key={index}>
                        <Grid container alignItems="center">
                            <Grid item xs={8}>
                                <ListItemText primary={file.filename_download} />
                            </Grid>
                            <Grid item xs={2}>
                                <IconButton edge="end" aria-label="delete" onClick={() => onDelete(file.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </Grid>
                            <Grid item xs={2}>
                                <IconButton edge="end" aria-label="download" onClick={() => handleDownload(file)}>
                                    <FileDownloadIcon />
                                </IconButton>
                            </Grid>
                        </Grid>
                    </ListItem>
                ))}
            </List>
            <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
            >
                Загрузить файлы
                <input
                    type="file"
                    hidden
                    multiple
                    onChange={(e) => onUpload(e.target.files)}
                />
            </Button>
        </Box>
    );
};

export default FileUpload;
