import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPhonebookDepartments } from '../services/directus';
import './PhonebookPage.css';

const SLOT_ROWS = [
    [1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10],
    [11, 12, 13, 14],
    [15, 16, 17],
    [18, 19, 20, 21],
    [22, 23, 24],
];

const RESERVED_SLOTS = new Set([9, 12, 13, 16]);

const buildSlotsMap = (departments) => {
    const map = new Map();

    departments.forEach((department) => {
        const sort = Number(department?.sort);

        if (!Number.isInteger(sort) || sort < 1 || sort > 24) {
            console.warn('Phonebook: skipped department with invalid sort', department);
            return;
        }

        if (RESERVED_SLOTS.has(sort)) {
            console.warn('Phonebook: skipped department in reserved slot', department);
            return;
        }

        if (map.has(sort)) {
            console.warn('Phonebook: duplicate slot, keeping first department', {
                kept: map.get(sort),
                skipped: department,
            });
            return;
        }

        map.set(sort, {
            id: department.id,
            name: department.name,
            sort,
        });
    });

    return map;
};

function PhonebookPage() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadDepartments = async () => {
            setLoading(true);
            setError('');

            try {
                const data = await fetchPhonebookDepartments();
                if (!active) {
                    return;
                }
                setDepartments(Array.isArray(data) ? data : []);
            } catch (loadError) {
                if (!active) {
                    return;
                }
                console.error('Phonebook: failed to load departments', loadError);
                setError('Не удалось загрузить отделы. Попробуйте обновить страницу.');
                setDepartments([]);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadDepartments();

        return () => {
            active = false;
        };
    }, []);

    const slotsMap = useMemo(() => buildSlotsMap(departments), [departments]);

    return (
        <div className="phonebook-page">
            <header className="phonebook-header">
                <img src="/logo.png" alt="Астерит" className="phonebook-logo" />
                <div className="phonebook-search-wrap" aria-hidden>
                    <input className="phonebook-search" placeholder="Поиск" readOnly />
                    <span className="phonebook-search-arrow">➜</span>
                </div>
            </header>

            <main className="phonebook-main">
                {error ? <div className="phonebook-error">{error}</div> : null}

                <div className="phonebook-grid-scroll">
                    <section className="phonebook-grid-container">
                        <div aria-hidden className="phonebook-center-image" />

                        <div className="phonebook-grid">
                            {SLOT_ROWS.map((row, rowIndex) => (
                                <div
                                    key={`row-${rowIndex + 1}`}
                                    className={`phonebook-row ${(rowIndex + 1) % 2 === 0 ? 'phonebook-row-even' : 'phonebook-row-odd'}`}
                                >
                                    {row.map((slotNumber) => {
                                        if (RESERVED_SLOTS.has(slotNumber)) {
                                            return (
                                                <div
                                                    key={slotNumber}
                                                    className="hex-placeholder"
                                                    aria-hidden
                                                />
                                            );
                                        }

                                        if (loading) {
                                            return <div key={slotNumber} className="hex-cell hex-loading" aria-hidden />;
                                        }

                                        const department = slotsMap.get(slotNumber);

                                        if (!department) {
                                            return <div key={slotNumber} className="hex-cell hex-empty" aria-hidden />;
                                        }

                                        return (
                                            <Link
                                                key={slotNumber}
                                                to={`/phonebook/${department.id}`}
                                                className="hex-cell hex-filled"
                                            >
                                                <span>{department.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default PhonebookPage;
