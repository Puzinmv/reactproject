import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ImportContactsIcon from '@mui/icons-material/ImportContacts';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import TemplatePanel from './TemplatePanel';

export default function CustomTable({ depatmentid, jobDescriptions, projectCardRole, handleJobChange }) {
    const [rows, setRows] = useState(jobDescriptions || []);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleAddRow = () => {
        const newRow = [...rows, { id: rows.length + 1, jobName: '', resourceDay: 0, frameDay: 0 }];
        if (handleJobChange(newRow)) setRows(newRow);
    };

    const handleDeleteRow = (index) => {
        if (index < rows.length) {
            for (let i = index + 1; i < rows.length; i++) {
                rows[i].id = i
            }
        }
        const newRow = rows.filter((_, i) => i !== index)

        if (handleJobChange(newRow)) setRows(newRow);
    };

    const handleAddFromTemplate = (templateRows) => {
        let maxId = rows.length ? Math.max(...rows.map(r => r.id)) : 0;

        const newRows = templateRows.map((row) => {
            maxId += 1;
            return {
                jobName: row.jobName,
                resourceDay: row.resourceDay,
                frameDay: row.frameDay,
                id: maxId,
            };
        });
        const row = [...rows, ...newRows]
        if (handleJobChange(row)) setRows(row);
    };
    const handleCellEdit = (id, key, value) => {
        const newRow = rows.map(row => (row.id === id ? { ...row, [key]: value } : row))
        if (handleJobChange(newRow)) setRows(newRow);      
    };

    const handleCopyToClipboard = () => {
        
        const rowsForCopy = rows.map(row => {
            const formattedJobName = `"${row.jobName.replace(/"/g, '""')}"`; // Оборачиваем в кавычки и экранируем кавычки внутри текста
            return [row.id, formattedJobName, row.resourceDay, row.frameDay].join('\t');
        }).join('\n');
        console.log(rows, rowsForCopy)
        navigator.clipboard.writeText(rowsForCopy).then(() => {
            setOpenSnackbar(true);  
        }).catch(err => {
            console.log(err) 
        });
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ width: '100%', mb: 1 }}>
                <Toolbar
                    sx={{
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 },
                    }}
                >
                    <Typography
                        sx={{ flex: '1 1 100%' }}
                        variant="h6"
                        id="tableTitle"
                        component="div"
                    >
                        Описание работ
                    </Typography>
                    <Tooltip title="Добавить строку">
                        <IconButton onClick={handleAddRow}>
                            <AddCircleIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Выбрать из шаблона">
                        <IconButton onClick={() => setIsPanelOpen(true)}>
                            <ImportContactsIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Копировать в буфер обмена">
                        <IconButton onClick={handleCopyToClipboard}>
                            <ContentCopyIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
                <TableContainer
                    sx={{ border: 1, borderColor: 'grey.500'}}>
                    <Table
                        sx={{ minWidth: 750 }}
                        aria-labelledby="tableTitle"
                        size='small'
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 20, fontWeight: 'bold', textAlign: 'center' }}>№</TableCell>
                                <TableCell sx={{ width: '90%', fontWeight: 'bold', textAlign: 'center' }}>Наименование работ</TableCell>
                                <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Ресурсная</TableCell>
                                <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Рамочная</TableCell>
                                <TableCell sx={{ width: 20, textAlign: 'center' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, index) => {
                                return (
                                    <TableRow
                                        hover
                                        role="checkbox"
                                        tabIndex={-1}
                                        key={index}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell
                                            sx={{ width: 20, textAlign: 'center' }}
                                            contentEditable={projectCardRole === 'Admin' ||
                                            projectCardRole === 'Technical'}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'id', e.target.textContent)}
                                        >
                                            {row.id}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: '90%', whiteSpace: 'pre-line' }}
                                            component="th"
                                            scope="row"
                                            padding="none"
                                            contentEditable={projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical'}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'jobName', e.target.textContent)}
                                        >
                                            {row.jobName}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right"
                                            contentEditable={projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical'}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'resourceDay', e.target.textContent)}
                                        >
                                            {row.resourceDay}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right"
                                            contentEditable={projectCardRole === 'Admin' ||
                                                projectCardRole === 'Technical'}
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'frameDay', e.target.textContent)}
                                        >
                                            {row.frameDay}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Удалить">
                                                <IconButton onClick={() => handleDeleteRow(index)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            {isPanelOpen && (
                <TemplatePanel
                    depatmentid={depatmentid}
                    onClose={() => setIsPanelOpen(false)}
                    onAdd={handleAddFromTemplate}
                />
            )}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
                    Таблица скопирована в буфер обмена
                </Alert>
            </Snackbar>
        </Box>
    );
}
