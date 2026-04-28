import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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


const EMPTY_DRAG_STATE = {
    sourceIndex: null,
    overIndex: null,
    insertIndex: null,
    isAITable: false,
};

const CustomTable = forwardRef(function CustomTable(
    { depatmentid, jobDescriptions, aiJobDescriptions, projectCardRole, handleJobChange, handleAiJobChange, disabled, price, cost },
    ref
) {
    const [rows, setRows] = useState(jobDescriptions || []);
    const rootRef = useRef(null);
    const autoScrollFrameRef = useRef(null);
    const autoScrollStateRef = useRef({
        container: null,
        clientY: null,
    });
    const pointerPositionRef = useRef({
        clientX: null,
        clientY: null,
    });
    const dragStateRef = useRef(EMPTY_DRAG_STATE);
    const [dragState, setDragState] = useState(EMPTY_DRAG_STATE);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState({ 
        open: false, 
        message: '', 
        severity: 'success' 
    });
    const [isOriginalExpanded, setIsOriginalExpanded] = useState(!aiJobDescriptions?.length);
    const [isLoading, setIsLoading] = useState(false);
    const canEditRows = !disabled && (projectCardRole === 'Admin' || projectCardRole === 'Technical');
    const tableColumnCount = disabled ? 5 : 6;

    const updateDragState = (nextDragState) => {
        setDragState((prevDragState) => {
            const resolvedDragState =
                typeof nextDragState === 'function'
                    ? nextDragState(prevDragState)
                    : nextDragState;

            dragStateRef.current = resolvedDragState;
            return resolvedDragState;
        });
    };

    const resetDragState = () => {
        updateDragState({ ...EMPTY_DRAG_STATE });
    };

    const stopAutoScroll = () => {
        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
            autoScrollFrameRef.current = null;
        }

        autoScrollStateRef.current = {
            container: null,
            clientY: null,
        };
    };

    const resetPointerPosition = () => {
        pointerPositionRef.current = {
            clientX: null,
            clientY: null,
        };
    };

    const getScrollContainer = (element) => {
        let currentElement = element;

        while (currentElement) {
            const styles = window.getComputedStyle(currentElement);
            const isScrollable =
                (styles.overflowY === 'auto' || styles.overflowY === 'scroll') &&
                currentElement.scrollHeight > currentElement.clientHeight;

            if (isScrollable) {
                return currentElement;
            }

            currentElement = currentElement.parentElement;
        }

        return document.scrollingElement || document.documentElement;
    };

    const updateDragTargetFromPoint = (clientX, clientY) => {
        const activeDragState = dragStateRef.current;

        if (activeDragState.sourceIndex === null || clientX === null || clientY === null) {
            return;
        }

        const rowElement = document
            .elementFromPoint(clientX, clientY)
            ?.closest('[data-custom-table-row="true"]');

        if (!rowElement) {
            return;
        }

        const rowIndex = Number(rowElement.getAttribute('data-row-index'));
        const isAITableRow = rowElement.getAttribute('data-ai-table') === 'true';
        const rowRect = rowElement.getBoundingClientRect();
        const insertIndex = clientY > rowRect.top + rowRect.height / 2 ? rowIndex + 1 : rowIndex;

        if (Number.isNaN(rowIndex) || isAITableRow !== activeDragState.isAITable) {
            return;
        }

        if (rowIndex !== activeDragState.overIndex || insertIndex !== activeDragState.insertIndex) {
            updateDragState((prevDragState) => ({
                ...prevDragState,
                overIndex: rowIndex,
                insertIndex,
            }));
        }
    };

    const runAutoScroll = () => {
        const { container, clientY } = autoScrollStateRef.current;

        if (!container || clientY === null) {
            autoScrollFrameRef.current = null;
            return;
        }

        const isPageScrollContainer =
            container === document.body ||
            container === document.documentElement ||
            container === document.scrollingElement;
        const containerRect = isPageScrollContainer
            ? { top: 0, bottom: window.innerHeight }
            : container.getBoundingClientRect();
        const threshold = 72;
        let scrollDelta = 0;

        if (clientY < containerRect.top + threshold) {
            scrollDelta = -Math.ceil((containerRect.top + threshold - clientY) / 10);
        } else if (clientY > containerRect.bottom - threshold) {
            scrollDelta = Math.ceil((clientY - (containerRect.bottom - threshold)) / 10);
        }

        if (scrollDelta !== 0) {
            if (isPageScrollContainer) {
                window.scrollBy(0, scrollDelta);
            } else {
                container.scrollTop += scrollDelta;
            }

            updateDragTargetFromPoint(
                pointerPositionRef.current.clientX,
                pointerPositionRef.current.clientY
            );
        }

        autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
    };

    const ensureAutoScroll = () => {
        if (autoScrollFrameRef.current === null) {
            autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
        }
    };

    const normalizeRowOrder = (tableRows) => tableRows.map((row, index) => ({
        ...row,
        id: index + 1,
    }));

    const getActiveInsertIndex = (isAITable = false) => (
        dragState.sourceIndex !== null && dragState.isAITable === isAITable
            ? dragState.insertIndex
            : null
    );

    const shouldShowInsertIndicatorAt = (insertIndex, isAITable = false) => {
        const activeInsertIndex = getActiveInsertIndex(isAITable);

        if (activeInsertIndex === null || activeInsertIndex !== insertIndex) {
            return false;
        }

        return !(
            insertIndex === dragState.sourceIndex ||
            insertIndex === dragState.sourceIndex + 1
        );
    };

    const renderInsertIndicatorRow = (insertIndex, isAITable = false) => {
        if (!shouldShowInsertIndicatorAt(insertIndex, isAITable)) {
            return null;
        }

        return (
            <TableRow key={`insert-indicator-${isAITable ? 'ai' : 'main'}-${insertIndex}`}>
                <TableCell
                    colSpan={tableColumnCount}
                    sx={{
                        p: 0,
                        borderBottom: 'none',
                        bgcolor: 'transparent',
                    }}
                >
                    <Box
                        sx={{
                            px: 1.5,
                            py: 0.35,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'primary.main',
                            pointerEvents: 'none',
                        }}
                    >
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.16)',
                                flexShrink: 0,
                            }}
                        />
                        <Box
                            sx={{
                                flex: 1,
                                height: 3,
                                borderRadius: 999,
                                bgcolor: 'primary.main',
                                boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.12)',
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                color: 'primary.main',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Отпустите, чтобы вставить
                        </Typography>
                    </Box>
                </TableCell>
            </TableRow>
        );
    };

    useEffect(() => () => {
        stopAutoScroll();
    }, []);

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

    const handleReorderRows = (sourceIndex, insertIndex, isAITable = false) => {
        if (sourceIndex === null || insertIndex === null) {
            return;
        }

        const targetRows = [...(isAITable ? aiJobDescriptions : rows)];

        if (
            sourceIndex < 0 ||
            insertIndex < 0 ||
            sourceIndex >= targetRows.length ||
            insertIndex > targetRows.length
        ) {
            return;
        }

        const [movedRow] = targetRows.splice(sourceIndex, 1);
        const normalizedInsertIndex = sourceIndex < insertIndex ? insertIndex - 1 : insertIndex;

        if (normalizedInsertIndex === sourceIndex) {
            return;
        }

        targetRows.splice(normalizedInsertIndex, 0, movedRow);
        const reorderedRows = normalizeRowOrder(targetRows);

        if (isAITable) {
            handleAiJobChange(reorderedRows);
            return;
        }

        if (handleJobChange(reorderedRows)) {
            setRows(reorderedRows);
        }
    };

    // The drag listeners intentionally subscribe only while a row is being dragged.
    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        if (dragState.sourceIndex === null) {
            return undefined;
        }

        const handleMouseMoveWhileDragging = (event) => {
            pointerPositionRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
            };
            autoScrollStateRef.current = {
                ...autoScrollStateRef.current,
                clientY: event.clientY,
            };
            updateDragTargetFromPoint(event.clientX, event.clientY);
            ensureAutoScroll();
        };

        const handleMouseUpWhileDragging = (event) => {
            pointerPositionRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
            };
            updateDragTargetFromPoint(event.clientX, event.clientY);

            const { sourceIndex, insertIndex, isAITable } = dragStateRef.current;

            stopAutoScroll();
            resetPointerPosition();
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            resetDragState();

            if (sourceIndex !== null && insertIndex !== null) {
                handleReorderRows(sourceIndex, insertIndex, isAITable);
            }
        };

        const handleScrollWhileDragging = () => {
            updateDragTargetFromPoint(
                pointerPositionRef.current.clientX,
                pointerPositionRef.current.clientY
            );
        };

        const handleBlurWhileDragging = () => {
            stopAutoScroll();
            resetPointerPosition();
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            resetDragState();
        };

        const scrollContainer = autoScrollStateRef.current.container;

        window.addEventListener('mousemove', handleMouseMoveWhileDragging);
        window.addEventListener('mouseup', handleMouseUpWhileDragging);
        window.addEventListener('blur', handleBlurWhileDragging);
        scrollContainer?.addEventListener('scroll', handleScrollWhileDragging, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMoveWhileDragging);
            window.removeEventListener('mouseup', handleMouseUpWhileDragging);
            window.removeEventListener('blur', handleBlurWhileDragging);
            scrollContainer?.removeEventListener('scroll', handleScrollWhileDragging);
        };
    }, [dragState.sourceIndex]);
    /* eslint-enable react-hooks/exhaustive-deps */

    const handleDragHandleMouseDown = (index, isAITable = false) => (event) => {
        if (!canEditRows) {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        pointerPositionRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
        };
        autoScrollStateRef.current = {
            container: getScrollContainer(rootRef.current || event.currentTarget),
            clientY: event.clientY,
        };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        ensureAutoScroll();
        updateDragState({
            sourceIndex: index,
            overIndex: index,
            insertIndex: index,
            isAITable,
        });
    };

    const renderDragHandle = (index, isAITable = false) => {
        if (!canEditRows) {
            return null;
        }

        const isDragging = dragState.sourceIndex === index && dragState.isAITable === isAITable;

        return (
            <Tooltip title="Перетащите, чтобы изменить порядок">
                <Box
                    onMouseDown={handleDragHandleMouseDown(index, isAITable)}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDragging ? 'primary.main' : 'text.secondary',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        borderRadius: 1,
                        width: '20px',
                        height: '20px',
                        p: 0,
                        lineHeight: 0,
                        userSelect: 'none',
                        transition: 'color 0.15s ease, background-color 0.15s ease',
                        '&:hover': {
                            bgcolor: 'action.hover',
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
        <Box
            ref={rootRef}
            sx={{ width: '100%' }}
        >
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
                    <TableContainer
                        sx={{
                            border: 1,
                            borderColor: dragState.sourceIndex !== null && dragState.isAITable === false ? 'primary.light' : 'grey.500',
                            boxShadow: dragState.sourceIndex !== null && dragState.isAITable === false
                                ? '0 0 0 1px rgba(25, 118, 210, 0.18)'
                                : 'none',
                            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                    >
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
                                    const isSourceRow =
                                        dragState.sourceIndex === index &&
                                        dragState.isAITable === false;

                                    return (
                                        <React.Fragment key={`main-row-${row.id ?? index}`}>
                                            {renderInsertIndicatorRow(index, false)}
                                            <TableRow
                                                hover={dragState.sourceIndex === null}
                                                role="checkbox"
                                                tabIndex={-1}
                                                data-custom-table-row="true"
                                                data-row-index={index}
                                                data-ai-table="false"
                                                sx={{
                                                    opacity: isSourceRow ? 0.55 : 1,
                                                    transform: isSourceRow ? 'scale(0.995)' : 'none',
                                                    transition: 'background-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
                                        </React.Fragment>
                                    );
                                })}
                                {renderInsertIndicatorRow(rows.length, false)}
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
                    <TableContainer
                        sx={{
                            border: 1,
                            borderColor: dragState.sourceIndex !== null && dragState.isAITable === true ? 'primary.light' : 'grey.500',
                            boxShadow: dragState.sourceIndex !== null && dragState.isAITable === true
                                ? '0 0 0 1px rgba(25, 118, 210, 0.18)'
                                : 'none',
                            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                    >
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
                                    const isSourceRow =
                                        dragState.sourceIndex === index &&
                                        dragState.isAITable === true;

                                    return (
                                        <React.Fragment key={`ai-row-${row.id ?? index}`}>
                                            {renderInsertIndicatorRow(index, true)}
                                            <TableRow
                                                hover={dragState.sourceIndex === null}
                                                role="checkbox"
                                                tabIndex={-1}
                                                data-custom-table-row="true"
                                                data-row-index={index}
                                                data-ai-table="true"
                                                sx={{
                                                    opacity: isSourceRow ? 0.55 : 1,
                                                    transform: isSourceRow ? 'scale(0.995)' : 'none',
                                                    transition: 'background-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
                                        </React.Fragment>
                                    );
                                })}
                                {renderInsertIndicatorRow(aiJobDescriptions.length, true)}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
});

export default CustomTable;
