import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPhonebookDepartments, fetchPhonebookUsersByDepartment } from '../services/directus';
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

const formatFullName = (user) => {
    return [user?.last_name, user?.first_name, user?.middleName]
        .filter((part) => Boolean(part && String(part).trim()))
        .join(' ')
        .trim();
};

function PhonebookPage() {
    const { id: departmentId } = useParams();
    const isDepartmentPage = Boolean(departmentId);

    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            setLoading(true);
            setError('');

            try {
                if (isDepartmentPage) {
                    const [departmentData, usersData] = await Promise.all([
                        fetchPhonebookDepartments(),
                        fetchPhonebookUsersByDepartment(departmentId),
                    ]);

                    if (!active) {
                        return;
                    }

                    setDepartments(Array.isArray(departmentData) ? departmentData : []);
                    setUsers(Array.isArray(usersData) ? usersData : []);
                } else {
                    const departmentData = await fetchPhonebookDepartments();

                    if (!active) {
                        return;
                    }

                    setDepartments(Array.isArray(departmentData) ? departmentData : []);
                    setUsers([]);
                }
            } catch (loadError) {
                if (!active) {
                    return;
                }
                console.error('Phonebook: failed to load data', loadError);
                setError('Не удалось загрузить данные телефонного справочника. Попробуйте обновить страницу.');
                setDepartments([]);
                setUsers([]);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            active = false;
        };
    }, [departmentId, isDepartmentPage]);

    const slotsMap = useMemo(() => buildSlotsMap(departments), [departments]);
    const activeDepartment = useMemo(
        () => departments.find((department) => String(department.id) === String(departmentId)),
        [departments, departmentId],
    );

    const departmentTitle = activeDepartment?.name || 'Отдел';

    const renderAvatar = (user) => {
        const avatarValue = user?.avatar;
        const avatarId = typeof avatarValue === 'object' ? avatarValue?.id : avatarValue;

        if (!avatarId) {
            return <div className="phonebook-contact-avatar-placeholder">ФОТО</div>;
        }

        return (
            <img
                src={`${process.env.REACT_APP_API_URL}/assets/${avatarId}`}
                alt={`${user?.last_name || ''} ${user?.first_name || ''}`.trim() || 'Фото сотрудника'}
                className="phonebook-contact-avatar-image"
                loading="lazy"
            />
        );
    };

    const renderDepartmentPage = () => (
        <main className="phonebook-main phonebook-main-department">
            {error ? <div className="phonebook-error">{error}</div> : null}

            <section className="phonebook-department-content">
                <div className="phonebook-department-header-row">
                    <Link to="/phonebook" className="phonebook-back-button">
                        Назад
                    </Link>
                    <div className="phonebook-department-title">{departmentTitle}</div>
                </div>

                <div className="phonebook-department-list">
                    {loading ? (
                        <div className="phonebook-department-empty">Загрузка...</div>
                    ) : null}

                    {!loading && users.length === 0 && !error ? (
                        <div className="phonebook-department-empty">В этом отделе пока нет сотрудников.</div>
                    ) : null}

                    {!loading && users.map((user) => (
                        <article key={user.id} className="phonebook-contact-row">
                            <div className="phonebook-contact-avatar">{renderAvatar(user)}</div>
                            <div className="phonebook-contact-name">{formatFullName(user)}</div>
                            <div className="phonebook-contact-position">{user?.title || ''}</div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );

    const renderDepartmentsGrid = () => (
        <main className="phonebook-main">
            {error ? <div className="phonebook-error">{error}</div> : null}

            <div className="phonebook-grid-scroll">
                <section className="phonebook-grid-container">
                    <div aria-hidden className="phonebook-center-image">
                        <img src="/image.png" alt="" />
                    </div>

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
    );

    return (
        <div className="phonebook-page">
            <header className="phonebook-header">
                <Link to="/phonebook" className="phonebook-logo-link">
                    <img src="/logo.png" alt="Астерит" className="phonebook-logo" />
                </Link>
                <div className="phonebook-search-wrap" aria-hidden>
                    <input className="phonebook-search" placeholder="Поиск" readOnly />
                    <span className="phonebook-search-arrow">➜</span>
                </div>
            </header>

            {isDepartmentPage ? renderDepartmentPage() : renderDepartmentsGrid()}
        </div>
    );
}

export default PhonebookPage;
