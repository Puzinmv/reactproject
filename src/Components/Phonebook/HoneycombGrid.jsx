import React from 'react';
import HoneycombCell from './HoneycombCell';
import './HoneycombGrid.css';

const HoneycombGrid = ({ departments, onDepartmentClick }) => {
    // Распределяем отделы по сетке: 7 строк
    // Нечетные строки (1, 3, 5, 7): 3 колонки
    // Четные строки (2, 4, 6): 4 колонки
    const rows = [];
    let departmentIndex = 0;

    for (let row = 1; row <= 7; row++) {
        const colsPerRow = row % 2 === 1 ? 3 : 4;
        const rowDepartments = [];

        for (let col = 0; col < colsPerRow && departmentIndex < departments.length; col++) {
            rowDepartments.push({
                department: departments[departmentIndex],
                index: departmentIndex
            });
            departmentIndex++;
        }

        rows.push({
            rowNumber: row,
            departments: rowDepartments
        });
    }

    return (
        <div className="honeycomb-grid">
            {rows.map((rowData) => (
                <div 
                    key={rowData.rowNumber} 
                    className={`honeycomb-row ${rowData.rowNumber % 2 === 1 ? 'odd-row' : 'even-row'}`}
                >
                    {rowData.departments.map((item) => (
                        <HoneycombCell
                            key={item.department.id}
                            department={item.department}
                            onClick={onDepartmentClick}
                            index={item.index}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default HoneycombGrid;
