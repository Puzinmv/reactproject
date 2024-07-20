import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import './TableComponent.css';

const TableComponent = ({ data, onRowSelect, onToggleColumnModal }) => {
    const [filterInput, setFilterInput] = useState('');
    const [columnOrder, setColumnOrder] = useState([]);
    const [hiddenColumns, setHiddenColumns] = useState({});
    const [columnWidths, setColumnWidths] = useState({});
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const columnHelper = createColumnHelper();
    const columns = useMemo(
        () => [
            {
                header: 'ID',
                accessorKey: 'id',
            },
            {
                header: 'Name',
                accessorKey: 'title',
            },
            columnHelper.accessor('Description', {
                header: 'Описание',
                cell: info => (
                    <div dangerouslySetInnerHTML={{ __html: info.getValue() }} />
                ),
            }),
            {
                header: 'Files',
                accessorKey: 'Files',
            },
            columnHelper.accessor('initiator', {
                header: 'Инициатор',
                cell: info => {
                    const user = info.getValue();
                    return `${user?.first_name} ${user?.last_name}`;
                },
            }),
            columnHelper.accessor('date_created', {
                header: 'Date Created',
                cell: info => {
                    const date = new Date(info.getValue());
                    return date.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    });
                },
            }),
        ],
        []
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            pagination,
            columnOrder: columnOrder,
            columnVisibility: hiddenColumns,
            columnSizing: columnWidths,
            globalFilter: filterInput,
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnOrderChange: setColumnOrder,
        onColumnVisibilityChange: setHiddenColumns,
        onColumnSizingChange: setColumnWidths,
        onPaginationChange: setPagination,
    });

    const handleFilterChange = (e) => {
        const value = e.target.value || undefined;
        setFilterInput(value);
        table.setGlobalFilter(value);
    };

    return (
        <div className="table-container">
            <div className="filter-container">
                <input
                    value={filterInput}
                    onChange={handleFilterChange}
                    placeholder="Search all columns"
                    className="filter-input"
                />
                <button onClick={onToggleColumnModal} className="toggle-columns-btn">
                    <i className="fas fa-columns"></i>
                </button>
            </div>
            <table className="data-table">
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} colSpan={header.colSpan} style={{ position: 'relative', width: header.getSize() }}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    {header.column.getCanResize() && (
                                        <div
                                            onMouseDown={header.getResizeHandler()}
                                            onTouchStart={header.getResizeHandler()}
                                            className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                                        ></div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id} onClick={() => onRowSelect(row.original)}>
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="pagination-controls">
                <button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>{'<<'}</button>
                <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>{'<'}</button>
                <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>{'>'}</button>
                <button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>{'>>'}</button>
                <select
                    value={table.getState().pagination.pageSize}
                    onChange={e => {
                        table.setPageSize(Number(e.target.value));
                    }}
                >
                    {[10, 20, 30, 40, 50].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                            {pageSize}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default TableComponent;
