import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ImportContactsIcon from '@mui/icons-material/ImportContacts';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import TemplatePanel from './TemplatePanel';

// Utility to generate unique IDs
let nextId = 1; // Initialize unique ID generator

function createData(jobName, resourceDay, frameDay) {
    return {
        id: nextId++, // Auto-increment ID
        jobName,
        resourceDay,
        frameDay,
    };
}

export default function CustomTable({ jobDescriptions }) {
    const [rows, setRows] = useState(() =>
        (jobDescriptions||[]).map((desc) => createData(desc.JobName, desc.ResourceDay, desc.FrameDay))
    );
    const [selected, setSelected] = useState([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);


    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = rows.map((row) => row.id);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

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

    const handleAddRow = () => {
        const newRow = createData('', 0, 0);
        setRows([...rows, newRow]);
    };

    const handleDeleteRow = (id) => {
        setRows(rows.filter((row) => row.id !== id));
        setSelected(selected.filter((selectedId) => selectedId !== id));
    };

    const handleAddFromTemplate = (templateRows) => {
        setRows([...rows, ...templateRows.map((row) => ({
            ...row,
            id: rows.length + row.id // Можно использовать другой метод для генерации ID
        }))]);
    };



    const isSelected = (id) => selected.indexOf(id) !== -1;

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ width: '100%', mb: 2 }}>
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
                </Toolbar>
                <TableContainer>
                    <Table
                        sx={{ minWidth: 750 }}
                        aria-labelledby="tableTitle"
                        size='small'
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 20, fontWeight: 'bold', textAlign: 'center' }} padding="checkbox">
                                    <Checkbox
                                        color="primary"
                                        indeterminate={selected.length > 0 && selected.length < rows.length}
                                        checked={rows.length > 0 && selected.length === rows.length}
                                        onChange={handleSelectAllClick}
                                        inputProps={{
                                            'aria-label': 'select all jobs',
                                        }}
                                    />
                                </TableCell>
                                <TableCell sx={{ width: 20, fontWeight: 'bold', textAlign: 'center' }}>№</TableCell>
                                <TableCell sx={{ width: '90%', fontWeight: 'bold', textAlign: 'center' }}>Наименование работ</TableCell>
                                <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Рамочная</TableCell>
                                <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Ресурсная</TableCell>
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
                                        <TableCell sx={{ width: 20, textAlign: 'center' }}  padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                checked={isItemSelected}
                                                inputProps={{
                                                    'aria-labelledby': labelId,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 20, textAlign: 'center' }}
                                            contentEditable
                                            suppressContentEditableWarning>{row.id}</TableCell>
                                        <TableCell
                                            sx={{ width: '90%'}}
                                            component="th"
                                            id={labelId}
                                            scope="row"
                                            padding="none"
                                            contentEditable
                                            suppressContentEditableWarning
                                        >
                                            {row.jobName}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right" contentEditable suppressContentEditableWarning>
                                            {row.resourceDay}
                                        </TableCell>
                                        <TableCell
                                            sx={{ width: 80 }}
                                            align="right" contentEditable suppressContentEditableWarning>
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
                    onClose={() => setIsPanelOpen(false)}
                    onAdd={handleAddFromTemplate}
                />
            )}
        </Box>
    );
}

//CustomTable.propTypes = {
//    jobDescriptions: PropTypes.arrayOf(
//        PropTypes.shape({
//            JobName: PropTypes.string.isRequired,
//            ResourceDay: PropTypes.number.isRequired,
//            FrameDay: PropTypes.number.isRequired,
//        })
//    ).isRequired,
//};
