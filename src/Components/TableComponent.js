import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination, Paper, Checkbox, IconButton, Box
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const TableComponent = ({ data, onRowSelect }) => {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('id');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);


  const [columns, setColumns] = useState({'',});

  const handleColumnVisibilityChange = (id) => {
    setColumns(columns.map(column => column.id === id ? { ...column, visible: !column.visible } : column));

    };
    useEffect(() => {
        console.log(data);
        if (data.length > 0) {
            console.log('useEffect',data);
            const initialColumns = Object.keys(data[0] || {}).map((key) => ({ id: key, visible: true }));
            setColumns(initialColumns);
        }

    },[data]);

    const handleDragEnd = (result) => {
        console.log(result);
        if (!result.destination) return;
        const reorderedColumns = Array.from(columns);
        const [removed] = reorderedColumns.splice(result.source.index, 1);
        reorderedColumns.splice(result.destination.index, 0, removed);
        setColumns(reorderedColumns);
    };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (row) => {
    if (onRowSelect) {
      onRowSelect(row);
    }
  };

  const sortedData = data.sort((a, b) => {
    if (orderBy) {
      if (order === 'asc') {
        return a[orderBy] > b[orderBy] ? 1 : -1;
      }
      return a[orderBy] < b[orderBy] ? 1 : -1;
    }
    return 0;
  });

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  //console.log(columns, paginatedData)
  return (
    <Paper>
      <TableContainer>
 <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns" direction="horizontal">
            {(provided) => (
              <Table {...provided.droppableProps} ref={provided.innerRef}>
                <TableHead>
                  <TableRow>
                    {columns.map((column, index) => (
                      column.visible && (
                        <Draggable key={column.id} draggableId={column.id} index={index}>
                          {(provided) => (
                            <TableCell
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Box display="flex" alignItems="center">
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  mr={1}
                                  {...provided.dragHandleProps}
                                >
                                  <DragIndicatorIcon />
                                </Box>
                                <TableSortLabel
                                  active={orderBy === column.id}
                                  direction={orderBy === column.id ? order : 'asc'}
                                  onClick={() => handleRequestSort(column.id)}
                                >
                                  {column.id}
                                </TableSortLabel>
                                <IconButton
                                  onClick={() => handleColumnVisibilityChange(column.id)}
                                  size="small"
                                  style={{ marginLeft: '10px' }}
                                >
                                  <Checkbox checked={column.visible} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          )}
                        </Draggable>
                      )
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row) => (
                    <TableRow key={row.id} hover onClick={() => handleRowClick(row)}>
                      {columns.map((column) => (
                        column.visible && (
                          <TableCell key={column.id}>
                            {typeof row[column.id] === 'object' ? JSON.stringify(row[column.id]) : row[column.id]}
                          </TableCell>
                        )
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                {provided.placeholder}
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default TableComponent;
