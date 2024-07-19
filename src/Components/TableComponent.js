import React, { useState, useEffect, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';
import './TableComponent.css'; // Импортируем стили
import { fetchData } from '../services/directus';

const TableComponent = ({ onRowSelect, onToggleColumnModal, setTableInstance, token, collection }) => {
    const [data, setData] = useState([]);
    const [filterInput, setFilterInput] = useState('');
    const [columnOrder, setColumnOrder] = useState([]);
    const [hiddenColumns, setHiddenColumns] = useState({});
    const [columnWidths, setColumnWidths] = useState({});
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

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
            {
                header: 'Description',
                accessorKey: 'Description',
            },
            {
                header: 'Files',
                accessorKey: 'Files',
            },
            {
                header: 'user_created',
                accessorKey: 'user_created',
            },
            {
                header: 'date_created',
                accessorKey: 'date_created',
            },
        ],
        []
    );

    useEffect(() => {
        const getData = async () => {
            const result = await fetchData(token, collection);
            setData(result);
            console.log(result);
        };
        getData();
        
    }, [token, collection]);

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

    useEffect(() => {
        setTableInstance(table);
    }, [table]);

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
