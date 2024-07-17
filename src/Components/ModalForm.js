import React from 'react';

const ModalForm = ({ row, onClose }) => {
    return (
        <div className="modal">
            <div className="modal-content">
                <span className="close" onClick={onClose}>
                    &times;
                </span>
                <h2>Row Details</h2>
                <pre>{JSON.stringify(row, null, 2)}</pre>
            </div>
        </div>
    );
};

export default ModalForm;
