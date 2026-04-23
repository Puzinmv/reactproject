import React, { useState, forwardRef, useImperativeHandle } from 'react';
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExcelJS from 'exceljs';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { improveJobDescriptions } from '../services/deepseek';
import CircularProgress from '@mui/material/CircularProgress';


const CustomTable = forwardRef(function CustomTable(
    { depatmentid, jobDescriptions, aiJobDescriptions, projectCardRole, handleJobChange, handleAiJobChange, disabled, price, cost },
    ref
) {
    const [rows, setRows] = useState(jobDescriptions || []);
    const [dragState, setDragState] = useState({
        sourceIndex: null,
        overIndex: null,
        isAITable: false,
    });
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState({ 
        open: false, 
        message: '', 
        severity: 'success' 
    });
    const [isOriginalExpanded, setIsOriginalExpanded] = useState(!aiJobDescriptions?.length);
    const [isLoading, setIsLoading] = useState(false);
    const canEditRows = !disabled && (projectCardRole === 'Admin' || projectCardRole === 'Technical');

    const resetDragState = () => {
        setDragState({
            sourceIndex: null,
            overIndex: null,
            isAITable: false,
        });
    };

    const normalizeRowOrder = (tableRows) => tableRows.map((row, index) => ({
        ...row,
        id: index + 1,
    }));

    const handleAddRow = (isAITable = false) => {
        const targetRows = isAITable ? aiJobDescriptions : rows;
        const newRow = [...targetRows, { 
            id: targetRows.length + 1, 
            jobName: '', 
            resourceDay: 0, 
            frameDay: 0 
        }];
        
        if (isAITable) {
            if (handleAiJobChange(newRow)) {
                // Обновление через пропсы
                handleAiJobChange(newRow);
            }
        } else {
            if (handleJobChange(newRow)) {
                setRows(newRow);
            }
        }
    };

    const handleDeleteRow = (index, isAITable = false) => {
        const targetRows = isAITable ? aiJobDescriptions : rows;
        
        if (index < targetRows.length) {
            for (let i = index + 1; i < targetRows.length; i++) {
                targetRows[i].id = i;
            }
        }
        const newRow = targetRows.filter((_, i) => i !== index);

        if (isAITable) {
            if (handleAiJobChange(newRow)) {
                handleAiJobChange(newRow);
            }
        } else {
            if (handleJobChange(newRow)) {
                setRows(newRow);
            }
        }
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
    const handleCellEdit = (id, key, value, isAITable = false) => {
        const targetRows = isAITable ? aiJobDescriptions : rows;
        const newRow = targetRows.map(row => (row.id === id ? { ...row, [key]: value } : row));
        
        if (isAITable) {
            if (handleAiJobChange(newRow)) {
                handleAiJobChange(newRow);
            }
        } else {
            if (handleJobChange(newRow)) {
                setRows(newRow);
            }
        }
    };

    const handleReorderRows = (sourceIndex, targetIndex, isAITable = false) => {
        if (sourceIndex === targetIndex || sourceIndex === null || targetIndex === null) {
            return;
        }

        const targetRows = [...(isAITable ? aiJobDescriptions : rows)];

        if (
            sourceIndex < 0 ||
            targetIndex < 0 ||
            sourceIndex >= targetRows.length ||
            targetIndex >= targetRows.length
        ) {
            return;
        }

        const [movedRow] = targetRows.splice(sourceIndex, 1);
        targetRows.splice(targetIndex, 0, movedRow);
        const reorderedRows = normalizeRowOrder(targetRows);

        if (isAITable) {
            handleAiJobChange(reorderedRows);
            return;
        }

        if (handleJobChange(reorderedRows)) {
            setRows(reorderedRows);
        }
    };

    const handleDragStart = (index, isAITable = false) => (event) => {
        if (!canEditRows) {
            return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${isAITable ? 'ai' : 'main'}:${index}`);
        setDragState({
            sourceIndex: index,
            overIndex: index,
            isAITable,
        });
    };

    const handleDragOver = (index, isAITable = false) => (event) => {
        if (!canEditRows || dragState.sourceIndex === null || dragState.isAITable !== isAITable) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (dragState.overIndex !== index) {
            setDragState((prev) => ({
                ...prev,
                overIndex: index,
            }));
        }
    };

    const handleDrop = (index, isAITable = false) => (event) => {
        event.preventDefault();

        if (!canEditRows || dragState.sourceIndex === null || dragState.isAITable !== isAITable) {
            resetDragState();
            return;
        }

        handleReorderRows(dragState.sourceIndex, index, isAITable);
        resetDragState();
    };

    const renderDragHandle = (index, isAITable = false) => {
        if (!canEditRows) {
            return null;
        }

        const isDragging = dragState.sourceIndex === index && dragState.isAITable === isAITable;

        return (
            <Tooltip title="Перетащите, чтобы изменить порядок">
                <Box
                    draggable
                    onDragStart={handleDragStart(index, isAITable)}
                    onDragEnd={resetDragState}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDragging ? 'primary.main' : 'text.secondary',
                        cursor: 'grab',
                        borderRadius: 1,
                        width: '20px',
                        height: '20px',
                        p: 0,
                        lineHeight: 0,
                        transition: 'color 0.15s ease, background-color 0.15s ease',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                        '&:active': {
                            cursor: 'grabbing',
                        },
                    }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </Box>
            </Tooltip>
        );
    };

    const handleCopyToClipboard = (dataSource = rows) => {
        const rowsForCopy = dataSource.map(row => {
            const formattedJobName = `"${row.jobName.replace(/"/g, '""')}"`;
            return [row.id, formattedJobName, row.resourceDay, row.frameDay].join('\t');
        }).join('\n');

        if (typeof rowsForCopy !== 'string' || rowsForCopy.trim() === '') {
            console.log('Ничего для копирования нет.');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(rowsForCopy)
                .then(() => setOpenSnackbar({ 
                    open: true, 
                    message: 'Текст скопирован в буфер обмена', 
                    severity: 'success' 
                }))
                .catch(err => console.log(err));
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = rowsForCopy;
            document.body.appendChild(textarea);

            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';

            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setOpenSnackbar({ 
                        open: true, 
                        message: 'Текст скопирован в буфер обмена', 
                        severity: 'success' 
                    });
                } else {
                    console.log('Не удалось скопировать текст');
                }
            } catch (err) {
                console.log('Ошибка при копировании', err);
            }

            document.body.removeChild(textarea);
        }
    };

    const handleExportToExcel = async (dataSource = rows) => {
        try {
            const response = await fetch(`${process.env.PUBLIC_URL}/templates/specification.xlsx`, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.getWorksheet(1);
            
            const startRow = 7;
            dataSource.forEach((row, index) => {
                const currentRow = worksheet.getRow(startRow + index);
                
                currentRow.getCell(1).value = Number(row.id) || 0;
                currentRow.getCell(2).value = row.jobName;
                currentRow.getCell(3).value = Number(row.frameDay) || 0;
                currentRow.getCell(9).value = Number(row.resourceDay) || 0;
                
                currentRow.getCell(1).numFmt = '0';
                currentRow.getCell(3).numFmt = '0';
                currentRow.getCell(9).numFmt = '0';
                
                currentRow.commit();
            });

            worksheet.getCell('D26').value = price;
            worksheet.getCell('J26').value = cost;

            worksheet.getCell('C26').value = { 
                formula: '=SUM(C7:C25)',
                result: dataSource.reduce((sum, row) => sum + (Number(row.frameDay) || 0), 0)
            };
            worksheet.getCell('I26').value = { 
                formula: '=SUM(I7:I25)',
                result: dataSource.reduce((sum, row) => sum + (Number(row.resourceDay) || 0), 0)
            };
            workbook.calcProperties.fullCalcOnLoad = true;
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Спецификация работы.xlsx';
            link.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error);
            alert('Произошла ошибка при экспорте в Excel');
        }
    };

    const handleImproveWithAI = async () => {
        if (!rows.length) {
            setOpenSnackbar({
                open: true,
                message: 'Добавьте хотя бы одну строку для улучшения описания',
                severity: 'warning',
            });
            return false;
        }
        setIsLoading(true);
        try {
            const improvedDescriptions = await improveJobDescriptions(rows, depatmentid);
            if (handleAiJobChange(improvedDescriptions)) {
                setIsOriginalExpanded(false);
                setOpenSnackbar({ 
                    open: true, 
                    message: 'Описание работ успешно улучшено', 
                    severity: 'success' 
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error improving descriptions:', error);
            setOpenSnackbar({ 
                open: true, 
                message: error.message || 'Ошибка при улучшении описания работ', 
                severity: 'error' 
            });
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleImproveWithAI,
    }));

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ width: '100%', mb: 1 }}>
                <Toolbar
                    sx={{
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 },
                        justifyContent: 'space-between'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {aiJobDescriptions && aiJobDescriptions.length > 0 && (
                            <IconButton
                                onClick={() => setIsOriginalExpanded(!isOriginalExpanded)}
                                sx={{ mr: 1 }}
                            >
                                <ExpandMoreIcon 
                                    sx={{ 
                                        transform: isOriginalExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        transition: '0.2s'
                                    }}
                                />
                            </IconButton>
                        )}
                        <Typography variant="h6" component="div">
                            Описание работ
                        </Typography>
                    </Box>
                    <Box>
                        <Tooltip title="Добавить строку">
                            <IconButton 
                                disabled={disabled}
                                onClick={() => handleAddRow(false)}>
                                <AddCircleIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Выбрать из шаблона">
                            <IconButton 
                                disabled={disabled} 
                                onClick={() => setIsPanelOpen(true)}>
                                <ImportContactsIcon />
                            </IconButton>
                        </Tooltip>
                        {rows.length > 0 && (
                            <Tooltip title="Дополнить с помощью ИИ">
                                <IconButton 
                                    onClick={handleImproveWithAI}
                                    disabled={isLoading || disabled || !(projectCardRole === 'Admin' || projectCardRole === 'Technical')}
                                    sx={{ position: 'relative' }}
                                >
                                    <AutoFixHighIcon />
                                    {isLoading && (
                                        <CircularProgress
                                            size={24}
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                marginTop: '-12px',
                                                marginLeft: '-12px',
                                            }}
                                        />
                                    )}
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Копировать в буфер обмена">
                            <IconButton onClick={() => handleCopyToClipboard()}>
                                <ContentCopyIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Экспорт в Excel">
                            <IconButton onClick={() => handleExportToExcel()}>
                                <FileDownloadIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
                <Collapse in={isOriginalExpanded}>
                    <TableContainer sx={{ border: 1, borderColor: 'grey.500'}}>
                        <Table
                            sx={{ minWidth: 750 }}
                            aria-labelledby="tableTitle"
                            size='small'
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: '20px', minWidth: '20px', maxWidth: '20px', p: 0, textAlign: 'center' }}></TableCell>
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
                                            onDragOver={handleDragOver(index, false)}
                                            onDrop={handleDrop(index, false)}
                                            sx={{
                                                backgroundColor:
                                                    dragState.overIndex === index &&
                                                    dragState.isAITable === false &&
                                                    dragState.sourceIndex !== index
                                                        ? 'action.hover'
                                                        : 'inherit',
                                                opacity:
                                                    dragState.sourceIndex === index &&
                                                    dragState.isAITable === false
                                                        ? 0.65
                                                        : 1,
                                                transition: 'background-color 0.15s ease, opacity 0.15s ease',
                                            }}
                                        >
                                            <TableCell sx={{ width: '20px', minWidth: '20px', maxWidth: '20px', p: 0, textAlign: 'center' }}>
                                                {renderDragHandle(index, false)}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: 20, textAlign: 'center' }}
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'id', e.target.textContent, false)}
                                            >
                                                {row.id}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: '90%', whiteSpace: 'pre-line' }}
                                                component="th"
                                                scope="row"
                                                padding="none"
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'jobName', e.target.textContent, false)}
                                            >
                                                {row.jobName}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: 80 }}
                                                align="right"
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'resourceDay', e.target.textContent, false)}
                                            >
                                                {row.resourceDay}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: 80 }}
                                                align="right"
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'frameDay', e.target.textContent, false)}
                                            >
                                                {row.frameDay}
                                            </TableCell>
                                            {!disabled && (
                                                <TableCell align="right">
                                                    <Tooltip title="Удалить">
                                                        <IconButton onClick={() => handleDeleteRow(index, false)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Collapse>
            </Paper>
            {isPanelOpen && (
                <TemplatePanel
                    depatmentid={depatmentid}
                    onClose={() => setIsPanelOpen(false)}
                    onAdd={handleAddFromTemplate}
                />
            )}
            <Snackbar
                open={openSnackbar.open}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert 
                    onClose={() => setOpenSnackbar(prev => ({ ...prev, open: false }))} 
                    severity={openSnackbar.severity} 
                    sx={{ width: '100%' }}
                >
                    {openSnackbar.message}
                </Alert>
            </Snackbar>
            {aiJobDescriptions && aiJobDescriptions.length > 0 && (
                <Paper sx={{ width: '100%', mb: 1 }}>
                    <Toolbar sx={{pl: { sm: 2 }, pr: { xs: 1, sm: 1 }, justifyContent: 'space-between'}}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
                                Описание работ (ИИ)
                            </Typography>
                        </Box>
                        <Box>
                            <Tooltip title="Добавить строку">
                                <IconButton 
                                    disabled={disabled}
                                    onClick={() => handleAddRow(true)}>
                                    <AddCircleIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Копировать в буфер обмена">
                                <IconButton onClick={() => handleCopyToClipboard(aiJobDescriptions)}>
                                    <ContentCopyIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Экспорт в Excel">
                                <IconButton onClick={() => handleExportToExcel(aiJobDescriptions)}>
                                    <FileDownloadIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Toolbar>
                    <TableContainer sx={{ border: 1, borderColor: 'grey.500'}}>
                        <Table sx={{ minWidth: 750 }} size='small'>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: '20px', minWidth: '20px', maxWidth: '20px', p: 0, textAlign: 'center' }}></TableCell>
                                    <TableCell sx={{ width: 20, fontWeight: 'bold', textAlign: 'center' }}>№</TableCell>
                                    <TableCell sx={{ width: '90%', fontWeight: 'bold', textAlign: 'center' }}>Наименование работ</TableCell>
                                    <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Ресурсная</TableCell>
                                    <TableCell sx={{ width: 80, fontWeight: 'bold', textAlign: 'center' }}>Рамочная</TableCell>
                                    <TableCell sx={{ width: 20, textAlign: 'center' }}></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {aiJobDescriptions.map((row, index) => {
                                    return (
                                        <TableRow
                                            hover
                                            role="checkbox"
                                            tabIndex={-1}
                                            key={index}
                                            onDragOver={handleDragOver(index, true)}
                                            onDrop={handleDrop(index, true)}
                                            sx={{
                                                backgroundColor:
                                                    dragState.overIndex === index &&
                                                    dragState.isAITable === true &&
                                                    dragState.sourceIndex !== index
                                                        ? 'action.hover'
                                                        : 'inherit',
                                                opacity:
                                                    dragState.sourceIndex === index &&
                                                    dragState.isAITable === true
                                                        ? 0.65
                                                        : 1,
                                                transition: 'background-color 0.15s ease, opacity 0.15s ease',
                                            }}
                                        >
                                            <TableCell sx={{ width: '20px', minWidth: '20px', maxWidth: '20px', p: 0, textAlign: 'center' }}>
                                                {renderDragHandle(index, true)}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: 20, textAlign: 'center' }}
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'id', e.target.textContent, true)}
                                            >
                                                {row.id}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: '90%', whiteSpace: 'pre-line' }}
                                                component="th"
                                                scope="row"
                                                padding="none"
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'jobName', e.target.textContent, true)}
                                            >
                                                {row.jobName}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: 80 }}
                                                align="right"
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'resourceDay', e.target.textContent, true)}
                                            >
                                                {row.resourceDay}
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: 80 }}
                                                align="right"
                                                contentEditable={canEditRows}
                                                suppressContentEditableWarning
                                                onBlur={(e) => handleCellEdit(row.id, 'frameDay', e.target.textContent, true)}
                                            >
                                                {row.frameDay}
                                            </TableCell>
                                            {!disabled && (
                                                <TableCell align="right">
                                                    <Tooltip title="Удалить">
                                                        <IconButton onClick={() => handleDeleteRow(index, true)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
});

export default CustomTable;
