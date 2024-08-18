import React, { useState, useEffect } from 'react';
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

export default function CustomTable({ depatmentid, jobDescriptions, handleJobChange }) {
    const [rows, setRows] = useState(jobDescriptions || []);
    const [selected, setSelected] = useState([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect( () => { handleJobChange(rows) } , [rows]);

    const handleAddRow = () => {
        const newRow = { id: rows.length + 1, jobName: '', resourceDay: 0, frameDay: 0 };
        setRows([...rows, newRow]);
    };

    const handleDeleteRow = (id) => {
        setRows(rows.filter((row) => row.id !== id));
        setSelected(selected.filter((selectedId) => selectedId !== id));
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
        setRows([...rows, ...newRows]);
    };
    const handleCellEdit = (id, key, value) => {
        setRows(rows.map(row => (row.id === id ? { ...row, [key]: value } : row)));
        
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    const handleCopyToClipboard = () => {
        const rowsForCopy = rows.map(row => {
            const formattedJobName = `"${row.jobName.replace(/"/g, '""')}"`; // Оборачиваем в кавычки и экранируем кавычки внутри текста
            return [row.id, formattedJobName, row.resourceDay, row.frameDay].join('\t');
        }).join('\n');
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
                        ...(selected.length > 0 && {
                            bgcolor: (theme) =>
                                theme.palette.action.activatedOpacity,
                        }),
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
                                const isItemSelected = isSelected(row.id);
                                const labelId = `custom-table-checkbox-${index}`;

                                return (
                                    <TableRow
                                        hover
                                        onClick={(event) => handleClick(event, row.id)}
                                        role="checkbox"
                                        aria-checked={isItemSelected}
                                        tabIndex={-1}
                                        key={row.id}
                                        selected={isItemSelected}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell
                                            sx={{ width: 20, textAlign: 'center' }}
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'id', e.target.textContent)}
                                        >
                                            {row.id}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: '90%', whiteSpace: 'pre-line' }}
                                            component="th"
                                            id={labelId}
                                            scope="row"
                                            padding="none"
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'jobName', e.target.textContent)}
                                        >
                                            {row.jobName}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right"
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'resourceDay', e.target.textContent)}
                                        >
                                            {row.resourceDay}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right"
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleCellEdit(row.id, 'frameDay', e.target.textContent)}
                                        >
                                            {row.frameDay}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Удалить">
                                                <IconButton onClick={() => handleDeleteRow(row.id)}>
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
