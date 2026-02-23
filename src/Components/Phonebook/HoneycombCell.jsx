import React from 'react';
import './HoneycombCell.css';

const HoneycombCell = ({ department, onClick, index }) => {
    const colors = ['#9D4EDD', '#FF006E', '#FF6B35']; // фиолетовый, розовый, оранжевый
    const colorIndex = index % colors.length;
    const color = colors[colorIndex];

    return (
        <div 
            className="honeycomb-cell" 
            onClick={() => onClick(department)}
            style={{ '--neon-color': color }}
        >
            <div className="honeycomb-cell-content">
                {department.name}
            </div>
        </div>
    );
};

export default HoneycombCell;
