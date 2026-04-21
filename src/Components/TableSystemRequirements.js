import React, { useEffect, useMemo, useState } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
    IconButton, Tooltip, Typography, Toolbar, Checkbox
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { ROLES } from '../constants/index.js';

const canEdit = (projectCardRole, disabled) => {
    if (disabled) return false;
    return projectCardRole === ROLES.ADMIN || projectCardRole === ROLES.TECHNICAL;
};

export default function TableSystemRequirements({ data, projectCardRole, handleChange, disabled, canApprove = false }) {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        if (Array.isArray(data)) {
            setRows(data);
        } else {
            setRows([]);
        }
    }, [data]);

    const editable = useMemo(() => canEdit(projectCardRole, disabled), [projectCardRole, disabled]);

    const pushChanges = (nextRows, options = {}) => {
        if (handleChange(nextRows, options)) {
            setRows(nextRows);
        }
    };

    const handleAddRow = () => {
        const nextRows = [...rows, { requirement: '', approved: null }];
        pushChanges(nextRows, { type: 'edit' });
    };

    const handleDeleteRow = (index) => {
        const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
        pushChanges(nextRows, { type: 'edit' });
    };

    const handleRequirementBlur = (index, value) => {
        const nextRows = rows.map((row, rowIndex) => (
            rowIndex === index ? { ...row, requirement: value } : row
        ));
        pushChanges(nextRows, { type: 'edit' });
    };

    const handleApprovedToggle = (index) => {
        if (!canApprove || disabled) return;
        const nextRows = rows.map((row, rowIndex) => (
            rowIndex === index ? { ...row, approved: !(row.approved === true) } : row
        ));
        pushChanges(nextRows, { type: 'approval' });
    };

    return (
        <Paper sx={{ width: '100%' }}>
            <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
                <Typography sx={{ flex: '1 1 100%' }} variant="h6" id="tableTitle" component="div">
                    Системные требования
                </Typography>
            </Toolbar>
            <TableContainer>
                <Table sx={{ border: 1, borderColor: 'grey.500' }} size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 20, fontWeight: 'bold', textAlign: 'center' }}>№</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                                Системные требования
                            </TableCell>
                            <TableCell sx={{ width: 200, fontWeight: 'bold', textAlign: 'center' }}>
                                Требования согласованы
                            </TableCell>
                            <TableCell sx={{ width: 20, textAlign: 'center' }}>
                                <Tooltip title="Добавить строку">
                                    <span>
                                        <IconButton disabled={!editable} onClick={handleAddRow}>
                                            <AddCircleIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow hover key={`${index}-${row.requirement || ''}`}>
                                <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
                                <TableCell
                                    sx={{ whiteSpace: 'pre-wrap' }}
                                    contentEditable={editable}
                                    suppressContentEditableWarning
                                    onBlur={(e) => handleRequirementBlur(index, e.target.textContent || '')}
                                >
                                    {row.requirement || ''}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                    <Checkbox
                                        checked={row.approved === true}
                                        indeterminate={row.approved === null || row.approved === undefined}
                                        disabled={!canApprove || disabled}
                                        onChange={() => handleApprovedToggle(index)}
                                    />
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                    <Tooltip title="Удалить">
                                        <span>
                                            <IconButton disabled={!editable} onClick={() => handleDeleteRow(index)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
