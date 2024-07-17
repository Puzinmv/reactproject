import React from 'react';

const ColumnVisibilityModal = ({ onClose, tableInstance }) => {
    return (
        <div className="modal">
            <div className="modal-content">
                <span className="close" onClick={onClose}>&times;</span>
                <h2>Toggle Column Visibility</h2>
                {tableInstance.getAllLeafColumns().map(column => (
                    <div key={column.id}>
                        <label>
                            <input
                                type="checkbox"
                                checked={column.getIsVisible()}
                                onChange={column.getToggleVisibilityHandler()}
                            />
                            {column.id}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ColumnVisibilityModal;
