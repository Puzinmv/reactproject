import React from 'react';
import { Box, Button, List, ListItem, ListItemText, Grid, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { CloudUpload } from '@mui/icons-material';

const FileUpload = ({ files, onUpload, onDelete, isReadOnly }) => {
    const handleDownload = (file) => {
        if (file?.file) {
            const objectUrl = URL.createObjectURL(file.file);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = file.filename_download || file.file.name;
            link.click();
            URL.revokeObjectURL(objectUrl);
            return;
        }

        const directusFileId = file?.directusFileId
            || file?.directus_files_id?.id
            || file?.directus_files_id;
        if (!directusFileId) {
            return;
        }

        const link = document.createElement('a');
        link.href = `${process.env.REACT_APP_API_URL}/assets/${directusFileId}?download`;
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
                        onChange={(e) => {
                            onUpload(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </Button>
            )}
            <List>
                {(files || []).map((file) => {
                    const canDownload = Boolean(
                        file?.file
                        || file?.directusFileId
                        || file?.directus_files_id?.id
                        || file?.directus_files_id
                    );

                    return (
                    <ListItem key={file.id || file.relationId || file.filename_download}>
                        <Grid container alignItems="center">
                            <Grid item xs={10}>
                                <ListItemText primary={file.filename_download || 'Файл без имени'} />
                            </Grid>
                            <Grid item xs={1}>
                                <IconButton
                                    edge="end"
                                    aria-label="download"
                                    onClick={() => handleDownload(file)}
                                    disabled={!canDownload}
                                >
                                    <FileDownloadIcon />
                                </IconButton>
                            </Grid>
                            {!isReadOnly && (
                                <Grid item xs={1}>
                                    <IconButton edge="end" aria-label="delete" onClick={() => onDelete(file.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Grid>
                            )}
                        </Grid>
                    </ListItem>
                    );
                })}
            </List>
        </Box>
    );
};

export default FileUpload;
