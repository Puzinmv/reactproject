import React from 'react';
import { Box, Button, List, ListItem, ListItemText, Grid, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { CloudUpload } from '@mui/icons-material';

const FileUpload = ({ files, onUpload, onDelete, isReadOnly }) => {
    const handleDownload = (file) => {
        const link = document.createElement('a');
        link.href = `${process.env.REACT_APP_API_URL}/assets/${file.id}?download`;
        link.download = file.filename_download;
        link.click();
    };
    return (
        <Box>
            {!isReadOnly && (
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
            )}
            <List>
                {files.map((file) => (
                    <ListItem key={file.id}>
                        <Grid container alignItems="center">
                            <Grid item xs={10}>
                                <ListItemText primary={file.filename_download} />
                            </Grid>
                            <Grid item xs={1}>
                                <IconButton edge="end" aria-label="download" onClick={() => handleDownload(file)}>
                                    <FileDownloadIcon />
                                </IconButton>
                            </Grid>
                            <Grid item xs={1}>
                                <IconButton edge="end" aria-label="delete" onClick={() => onDelete(file.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </Grid>
                        </Grid>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

export default FileUpload;
