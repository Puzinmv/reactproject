import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    fetchPhonebookDepartments,
    fetchPhonebookUserCard,
    fetchPhonebookUsersByDepartment,
    getCurrentUser,
    getToken,
    logout,
} from '../services/directus';
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

const toValueOrDash = (value) => {
    if (value === null || value === undefined) {
        return '-';
    }

    const text = String(value).trim();
    return text ? text : '-';
};

const getDepartmentNameSizeClass = (name) => {
    const text = String(name || '').trim();
    if (!text) {
        return '';
    }

    const maxWordLength = text
        .split(/\s+/)
        .reduce((max, word) => Math.max(max, word.length), 0);

    if (maxWordLength >= 22) {
        return 'hex-label-xxs';
    }

    if (maxWordLength >= 18) {
        return 'hex-label-xs';
    }

    if (maxWordLength >= 14) {
        return 'hex-label-sm';
    }

    return '';
};

function PhonebookPage() {
    const { id: departmentId } = useParams();
    const navigate = useNavigate();
    const isDepartmentPage = Boolean(departmentId);
    const userMenuRef = useRef(null);

    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserLoading, setSelectedUserLoading] = useState(false);
    const [selectedUserError, setSelectedUserError] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    useEffect(() => {
        let active = true;

        const loadCurrentUser = async () => {
            setIsAuthLoading(true);

            try {
                const token = await getToken();
                if (!token?.data) {
                    throw new Error('No valid token');
                }

                const user = await getCurrentUser();
                if (active) {
                    setCurrentUser(user || null);
                }
            } catch (authError) {
                if (active) {
                    setCurrentUser(null);
                }
            } finally {
                if (active) {
                    setIsAuthLoading(false);
                }
            }
        };

        loadCurrentUser();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!isUserMenuOpen) {
            return undefined;
        }

        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

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

                    const safeDepartments = Array.isArray(departmentData) ? departmentData : [];
                    const safeUsers = Array.isArray(usersData) ? usersData : [];

                    setDepartments(safeDepartments);
                    setUsers(safeUsers);
                    setSelectedUser(null);
                    setSelectedUserError('');

                    if (safeUsers.length === 1) {
                        setSelectedUserLoading(true);
                        try {
                            const cardUser = await fetchPhonebookUserCard(safeUsers[0].id);
                            if (!active) {
                                return;
                            }
                            if (!cardUser) {
                                setSelectedUserError('Не удалось загрузить карточку сотрудника.');
                            } else {
                                setSelectedUser(cardUser);
                            }
                        } catch (cardError) {
                            if (!active) {
                                return;
                            }
                            console.error('Phonebook: failed to load single user card', cardError);
                            setSelectedUserError('Не удалось загрузить карточку сотрудника.');
                        } finally {
                            if (active) {
                                setSelectedUserLoading(false);
                            }
                        }
                    }
                } else {
                    const departmentData = await fetchPhonebookDepartments();

                    if (!active) {
                        return;
                    }

                    setDepartments(Array.isArray(departmentData) ? departmentData : []);
                    setUsers([]);
                    setSelectedUser(null);
                    setSelectedUserError('');
                }
            } catch (loadError) {
                if (!active) {
                    return;
                }
                console.error('Phonebook: failed to load data', loadError);
                setError('Не удалось загрузить данные телефонного справочника. Попробуйте обновить страницу.');
                setDepartments([]);
                setUsers([]);
                setSelectedUser(null);
                setSelectedUserError('');
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

    const handleSelectUser = async (userId) => {
        setSelectedUserLoading(true);
        setSelectedUserError('');

        try {
            const cardUser = await fetchPhonebookUserCard(userId);
            if (!cardUser) {
                setSelectedUserError('Не удалось загрузить карточку сотрудника.');
                return;
            }
            setSelectedUser(cardUser);
        } catch (cardError) {
            console.error('Phonebook: failed to load user card', cardError);
            setSelectedUserError('Не удалось загрузить карточку сотрудника.');
        } finally {
            setSelectedUserLoading(false);
        }
    };

    const getCurrentUserAvatarUrl = () => {
        const avatarValue = currentUser?.avatar;
        const avatarId = typeof avatarValue === 'object' ? avatarValue?.id : avatarValue;

        if (!avatarId) {
            return '';
        }

        return `${process.env.REACT_APP_API_URL}/assets/${avatarId}`;
    };

    const handleLoginClick = () => {
        navigate('/?redirect=/phonebook');
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (logoutError) {
            console.error('Phonebook: failed to logout', logoutError);
        } finally {
            setCurrentUser(null);
            setIsUserMenuOpen(false);
        }
    };

    const renderDepartmentPage = () => (
        <main className="phonebook-main phonebook-main-department">
            {error ? <div className="phonebook-error">{error}</div> : null}

            <section className="phonebook-department-content">
                <div aria-hidden className="phonebook-center-image phonebook-center-image-faded">
                    <img src="/background-center.png" alt="" />
                </div>

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

                    {!loading && selectedUserError ? (
                        <div className="phonebook-department-empty">{selectedUserError}</div>
                    ) : null}

                    {!loading && !selectedUser && users.map((user) => (
                        <button
                            key={user.id}
                            type="button"
                            className="phonebook-contact-row phonebook-contact-row-button"
                            onClick={() => handleSelectUser(user.id)}
                        >
                            <div className="phonebook-contact-avatar">{renderAvatar(user)}</div>
                            <div className="phonebook-contact-name">{formatFullName(user)}</div>
                            <div className="phonebook-contact-position">{user?.title || ''}</div>
                        </button>
                    ))}

                    {!loading && selectedUserLoading ? (
                        <div className="phonebook-department-empty">Загрузка карточки...</div>
                    ) : null}

                    {!loading && selectedUser && !selectedUserLoading ? (
                        <article className="phonebook-user-card">
                            <button
                                type="button"
                                className="phonebook-user-card-back"
                                onClick={() => {
                                    setSelectedUser(null);
                                    setSelectedUserError('');
                                }}
                            >
                                К списку сотрудников
                            </button>

                            <div className="phonebook-user-card-main">
                                <div className="phonebook-user-card-avatar">{renderAvatar(selectedUser)}</div>

                                <div className="phonebook-user-card-fields">
                                    <div className="phonebook-user-card-row">
                                        <span>Ф.И.О.:</span>
                                        <span>{toValueOrDash(formatFullName(selectedUser))}</span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Должность:</span>
                                        <span>{toValueOrDash(selectedUser?.title)}</span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Вн. тел.:</span>
                                        <span>{toValueOrDash(selectedUser?.phone)}</span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Моб. тел.:</span>
                                        <span>{toValueOrDash(selectedUser?.mobile)}</span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Эл. почта:</span>
                                        <span>{toValueOrDash(selectedUser?.email)}</span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Дата рожд.:</span>
                                        <span>XX.XX.XXXX</span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Руководитель:</span>
                                        <span>{toValueOrDash(formatFullName(selectedUser?.Head))}</span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Город:</span>
                                        <span>—</span>
                                    </div>
                                </div>
                            </div>

                            <div className="phonebook-user-card-extra-title">Доп. сведения:</div>
                            <div className="phonebook-user-card-extra">{toValueOrDash(selectedUser?.description)}</div>
                        </article>
                    ) : null}
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
                        <img src="/background-center.png" alt="" />
                        <div className="phonebook-center-text">
                            <span>ИНДИВИДУАЛЬНЫЕ</span>
                            <span>СТРАТЕГИИ</span>
                            <span>ИНФОРМАЦИОННОЙ</span>
                            <span>БЕЗОПАСНОСТИ</span>
                        </div>
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
                                            <span className={getDepartmentNameSizeClass(department.name)}>{department.name}</span>
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
                <div className="phonebook-header-actions">
                    <div className="phonebook-search-wrap" aria-hidden>
                        <input className="phonebook-search" placeholder="Поиск" readOnly />
                        <span className="phonebook-search-arrow">➜</span>
                    </div>

                    {!isAuthLoading && !currentUser ? (
                        <button
                            type="button"
                            className="phonebook-auth-button"
                            onClick={handleLoginClick}
                            aria-label="Войти в аккаунт"
                            title="Войти"
                        >
                            <span className="phonebook-auth-icon" aria-hidden>
                                ◯
                            </span>
                        </button>
                    ) : null}

                    {!isAuthLoading && currentUser ? (
                        <div className="phonebook-user-menu" ref={userMenuRef}>
                            <button
                                type="button"
                                className="phonebook-user-avatar-button"
                                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                                aria-haspopup="menu"
                                aria-expanded={isUserMenuOpen}
                                aria-label="Меню пользователя"
                            >
                                {getCurrentUserAvatarUrl() ? (
                                    <img
                                        src={getCurrentUserAvatarUrl()}
                                        alt="Аватар пользователя"
                                        className="phonebook-user-avatar-image"
                                    />
                                ) : (
                                    <span className="phonebook-user-avatar-fallback">
                                        {(currentUser?.first_name || '?').slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </button>

                            {isUserMenuOpen ? (
                                <div className="phonebook-user-dropdown" role="menu">
                                    <button
                                        type="button"
                                        className="phonebook-user-dropdown-item"
                                        role="menuitem"
                                        onClick={handleLogout}
                                    >
                                        Выход
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </header>

            {isDepartmentPage ? renderDepartmentPage() : renderDepartmentsGrid()}
        </div>
    );
}

export default PhonebookPage;

