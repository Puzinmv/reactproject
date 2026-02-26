import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    fetchPhonebookDepartments,
    fetchPhonebookUserCard,
    fetchPhonebookUsersForSearch,
    fetchPhonebookUsersByDepartment,
    getDirectusAssetUrl,
    getCurrentUser,
    getToken,
    logout,
    updatePhonebookUserCard,
    uploadPhonebookUserAvatar,
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
const PHONEBOOK_DND_ROLE_ID = '6a4f07d3-0f93-4d19-8dd1-5205703334bb';
const MAX_AVATAR_SIZE_BYTES = 8 * 1024 * 1024;
const SEARCH_RESULTS_LIMIT = 70;
const AVATAR_SIZES = {
    list: { width: 132, height: 120 },
    card: { width: 480, height: 600 },
    currentUser: { width: 80, height: 80 },
};
const getUserRoleId = (user) => (typeof user?.role === 'object' ? user?.role?.id : user?.role);

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

const normalizeSearchText = (value) => String(value || '')
    .toLocaleLowerCase('ru')
    .replace(/\u0451/g, '\u0435')
    .replace(/\s+/g, ' ')
    .trim();

const toValueOrDash = (value) => {
    if (value === null || value === undefined) {
        return '-';
    }

    const text = String(value).trim();
    return text ? text : '-';
};

const formatBirthDate = (value) => {
    if (value === null || value === undefined) {
        return '-';
    }

    const text = String(value).trim();
    if (!text) {
        return '-';
    }

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
    }

    return text;
};

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

const normalizeBirthDateDraft = (rawValue) => {
    const text = String(rawValue ?? '').trim();

    if (!text) {
        return { normalizedValue: null, error: '' };
    }

    let dayText = '';
    let monthText = '';
    let yearChunk = '';

    const matchWithSeparators = text.match(/^(\d{1,2})\s*[.\-/ ]\s*(\d{1,2})(?:\s*[.\-/ ]\s*(\d{2}|\d{4}))?$/);
    if (matchWithSeparators) {
        dayText = matchWithSeparators[1];
        monthText = matchWithSeparators[2];
        yearChunk = matchWithSeparators[3] || '';
    } else {
        const digitsOnly = text.replace(/\D/g, '');
        if (/^\d{4}$/.test(digitsOnly)) {
            dayText = digitsOnly.slice(0, 2);
            monthText = digitsOnly.slice(2, 4);
        } else if (/^\d{6}$/.test(digitsOnly)) {
            dayText = digitsOnly.slice(0, 2);
            monthText = digitsOnly.slice(2, 4);
            yearChunk = digitsOnly.slice(4, 6);
        } else if (/^\d{8}$/.test(digitsOnly)) {
            dayText = digitsOnly.slice(0, 2);
            monthText = digitsOnly.slice(2, 4);
            yearChunk = digitsOnly.slice(4, 8);
        } else {
            return { normalizedValue: null, error: 'Дата рождения: используйте ДД.ММ, ДД.ММ.ГГ или ДД.ММ.ГГГГ.' };
        }
    }

    const day = Number(dayText);
    const month = Number(monthText);

    if (month < 1 || month > 12) {
        return { normalizedValue: null, error: 'Дата рождения: месяц должен быть от 01 до 12.' };
    }

    let fullYear = null;
    if (yearChunk) {
        if (yearChunk.length === 2) {
            const shortYear = Number(yearChunk);
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            let candidateYear = currentCentury + shortYear;
            if (candidateYear > currentYear) {
                candidateYear -= 100;
            }
            fullYear = candidateYear;
        } else {
            fullYear = Number(yearChunk);
        }

        if (fullYear < 1900 || fullYear > 2100) {
            return { normalizedValue: null, error: 'Дата рождения: год должен быть в диапазоне 1900-2100.' };
        }
    }

    const validationYear = fullYear ?? 2000;
    const maxDay = getDaysInMonth(month, validationYear);
    if (day < 1 || day > maxDay) {
        return { normalizedValue: null, error: 'Дата рождения: неверный день для указанного месяца.' };
    }

    if (!fullYear) {
        return {
            normalizedValue: `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`,
            error: '',
        };
    }

    return {
        normalizedValue: `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(fullYear).padStart(4, '0')}`,
        error: '',
    };
};

const getRelatedUserId = (user) => {
    if (!user) {
        return '';
    }

    if (typeof user === 'object') {
        return String(user?.id || '').trim();
    }

    return String(user).trim();
};

const getRelatedDepartmentId = (user) => {
    if (!user || typeof user !== 'object') {
        return '';
    }

    const department = user?.department;

    if (!department) {
        return '';
    }

    if (typeof department === 'object') {
        return String(department?.id || '').trim();
    }

    return String(department).trim();
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
    const location = useLocation();
    const navigate = useNavigate();
    const isDepartmentPage = Boolean(departmentId);
    const userMenuRef = useRef(null);
    const latestLevelSaveRequestRef = useRef(0);
    
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
    const [descriptionDraft, setDescriptionDraft] = useState('');
    const [levelDraft, setLevelDraft] = useState('');
    const [birthDateDraft, setBirthDateDraft] = useState('');
    const [birthDateValidationError, setBirthDateValidationError] = useState('');
    const [isSavingUserCard, setIsSavingUserCard] = useState(false);
    const [isSavingLevel, setIsSavingLevel] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchUsers, setSearchUsers] = useState([]);
    const searchResultUserId = useMemo(() => {
        const userId = location.state?.openUserId;

        if (userId === null || userId === undefined) {
            return '';
        }

        return String(userId);
    }, [location.state]);

    useEffect(() => {
        if (/^\/phonebook\/?$/.test(location.pathname)) {
            document.title = '\u0422\u0435\u043b\u0435\u0444\u043e\u043d\u043d\u0430\u044f \u043a\u043d\u0438\u0433\u0430';
        }
    }, [location.pathname]);

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
                    const [departmentData, usersData, allUsersData] = await Promise.all([
                        fetchPhonebookDepartments(),
                        fetchPhonebookUsersByDepartment(departmentId),
                        fetchPhonebookUsersForSearch(),
                    ]);

                    if (!active) {
                        return;
                    }

                    const safeDepartments = Array.isArray(departmentData) ? departmentData : [];
                    const safeUsers = Array.isArray(usersData) ? usersData : [];
                    const safeSearchUsers = Array.isArray(allUsersData) ? allUsersData : [];

                    setDepartments(safeDepartments);
                    setUsers(safeUsers);
                    setSearchUsers(safeSearchUsers);
                    setSelectedUser(null);
                    setSelectedUserError('');

                    const requestedUser = searchResultUserId
                        ? safeUsers.find((user) => String(user?.id) === searchResultUserId)
                        : null;
                    const autoOpenUser = requestedUser || (safeUsers.length === 1 ? safeUsers[0] : null);

                    if (autoOpenUser?.id) {
                        setSelectedUserLoading(true);
                        try {
                            const cardUser = await fetchPhonebookUserCard(autoOpenUser.id);
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
                    const [departmentData, allUsersData] = await Promise.all([
                        fetchPhonebookDepartments(),
                        fetchPhonebookUsersForSearch(),
                    ]);

                    if (!active) {
                        return;
                    }

                    setDepartments(Array.isArray(departmentData) ? departmentData : []);
                    setSearchUsers(Array.isArray(allUsersData) ? allUsersData : []);
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
                setSearchUsers([]);
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
    }, [departmentId, isDepartmentPage, searchResultUserId]);

    const slotsMap = useMemo(() => buildSlotsMap(departments), [departments]);
    const canEditSelectedUser = useMemo(
        () => !isAuthLoading
            && Boolean(currentUser)
            && String(getUserRoleId(currentUser)) === PHONEBOOK_DND_ROLE_ID,
        [currentUser, isAuthLoading],
    );
    const activeDepartment = useMemo(
        () => departments.find((department) => String(department.id) === String(departmentId)),
        [departments, departmentId],
    );
    const normalizedQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
    const hasSearchQuery = normalizedQuery.length > 0;
    const searchResults = useMemo(() => {
        if (!hasSearchQuery) {
            return [];
        }

        return searchUsers
            .filter((user) => {
                const fullName = normalizeSearchText(formatFullName(user));
                const title = normalizeSearchText(user?.title);
                const location = normalizeSearchText(user?.location);

                return fullName.includes(normalizedQuery)
                    || title.includes(normalizedQuery)
                    || location.includes(normalizedQuery);
            })
            .slice(0, SEARCH_RESULTS_LIMIT);
    }, [hasSearchQuery, normalizedQuery, searchUsers]);
    const groupedSearchResults = useMemo(() => {
        const groups = new Map();

        searchResults.forEach((user) => {
            const departmentIdKey = String(user?.department?.id || '');
            const departmentName = user?.department?.name || 'Без отдела';

            if (!groups.has(departmentIdKey)) {
                groups.set(departmentIdKey, {
                    departmentId: departmentIdKey,
                    departmentName,
                    users: [],
                });
            }

            groups.get(departmentIdKey).users.push(user);
        });

        return Array.from(groups.values());
    }, [searchResults]);

    const departmentTitle = activeDepartment?.name || 'Отдел';

    const renderAvatar = (user, size = AVATAR_SIZES.list) => {
        const avatarValue = user?.avatar;
        const avatarId = typeof avatarValue === 'object' ? avatarValue?.id : avatarValue;

        if (!avatarId) {
            return <div className="phonebook-contact-avatar-placeholder">ФОТО</div>;
        }

        return (
            <img
                src={getDirectusAssetUrl(avatarId, size)}
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

    useEffect(() => {
        setDescriptionDraft(selectedUser?.description || '');
    }, [selectedUser?.id, selectedUser?.description]);

    useEffect(() => {
        const formatted = formatBirthDate(selectedUser?.date_birthd);
        setBirthDateDraft(formatted === '-' ? '' : formatted);
        setBirthDateValidationError('');
    }, [selectedUser?.id, selectedUser?.date_birthd]);

    useEffect(() => {
        const rawLevel = selectedUser?.level;
        if (rawLevel === null || rawLevel === undefined || String(rawLevel).trim() === '') {
            setLevelDraft('');
            return;
        }

        setLevelDraft(String(rawLevel));
    }, [selectedUser?.id, selectedUser?.level]);

    useEffect(() => {
        setIsSavingLevel(false);
        latestLevelSaveRequestRef.current = 0;
    }, [selectedUser?.id]);

    const normalizeLevelValue = (rawValue) => {
        const text = String(rawValue ?? '').trim();
        if (!text) {
            return null;
        }

        const parsed = parseInt(text, 10);
        return Number.isNaN(parsed) ? null : parsed;
    };

    const handleLevelAutoSave = async (nextLevelDraft) => {
        if (!canEditSelectedUser || !selectedUser?.id) {
            return;
        }

        const normalizedLevel = normalizeLevelValue(nextLevelDraft);
        const normalizedCurrentLevel = normalizeLevelValue(selectedUser?.level);

        if (normalizedLevel === normalizedCurrentLevel) {
            return;
        }

        const userId = selectedUser.id;
        const requestId = latestLevelSaveRequestRef.current + 1;
        latestLevelSaveRequestRef.current = requestId;
        setIsSavingLevel(true);
        setSelectedUserError('');

        try {
            await updatePhonebookUserCard(userId, { level: normalizedLevel });

            setSelectedUser((prevUser) => (
                prevUser && String(prevUser.id) === String(userId)
                    ? { ...prevUser, level: normalizedLevel }
                    : prevUser
            ));
        } catch (saveError) {
            console.error('Phonebook: failed to auto-save user level', saveError);

            if (latestLevelSaveRequestRef.current === requestId) {
                setSelectedUserError('Не удалось сохранить уровень.');
            }
        } finally {
            if (latestLevelSaveRequestRef.current === requestId) {
                setIsSavingLevel(false);
            }
        }
    };

    const handleLevelDraftChange = (event) => {
        const nextValue = event.target.value;
        if (/^-?\d*$/.test(nextValue)) {
            setLevelDraft(nextValue);
            void handleLevelAutoSave(nextValue);
        }
    };

    const handleUserCardSave = async () => {
        if (!canEditSelectedUser || !selectedUser?.id || isSavingUserCard) {
            return;
        }

        const { normalizedValue: normalizedBirthDate, error: birthDateError } = normalizeBirthDateDraft(birthDateDraft);
        if (birthDateError) {
            setBirthDateValidationError(birthDateError);
            return;
        }

        setBirthDateValidationError('');
        setSelectedUserError('');
        setIsSavingUserCard(true);

        try {
            await updatePhonebookUserCard(selectedUser.id, {
                description: descriptionDraft,
                date_birthd: normalizedBirthDate,
            });
            setSelectedUser((prevUser) => (
                prevUser
                    ? {
                        ...prevUser,
                        description: descriptionDraft,
                        date_birthd: normalizedBirthDate,
                    }
                    : prevUser
            ));
        } catch (saveError) {
            console.error('Phonebook: failed to save user card', saveError);
            setSelectedUserError('Не удалось сохранить доп. сведения.');
        } finally {
            setIsSavingUserCard(false);
        }
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !canEditSelectedUser || !selectedUser?.id) {
            return;
        }

        if (!String(file.type || '').startsWith('image/')) {
            setSelectedUserError('Можно загрузить только изображение.');
            return;
        }

        if (file.size > MAX_AVATAR_SIZE_BYTES) {
            setSelectedUserError('Файл слишком большой. Максимальный размер: 8 МБ.');
            return;
        }

        setSelectedUserError('');
        setIsUploadingAvatar(true);

        try {
            const uploadedAvatar = await uploadPhonebookUserAvatar(file);
            const avatarId = typeof uploadedAvatar === 'object' ? uploadedAvatar?.id : uploadedAvatar;

            if (!avatarId) {
                throw new Error('No avatar id returned');
            }

            await updatePhonebookUserCard(selectedUser.id, { avatar: avatarId });

            setSelectedUser((prevUser) => (prevUser ? { ...prevUser, avatar: avatarId } : prevUser));
            setUsers((prevUsers) => prevUsers.map((user) => (
                String(user.id) === String(selectedUser.id)
                    ? { ...user, avatar: avatarId }
                    : user
            )));
        } catch (uploadError) {
            console.error('Phonebook: failed to update avatar', uploadError);
            setSelectedUserError('Не удалось обновить фото сотрудника.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const getCurrentUserAvatarUrl = () => {
        const avatarValue = currentUser?.avatar;
        const avatarId = typeof avatarValue === 'object' ? avatarValue?.id : avatarValue;

        if (!avatarId) {
            return '';
        }

        return getDirectusAssetUrl(avatarId, AVATAR_SIZES.currentUser);
    };

    const handleLoginClick = () => {
        navigate('/?redirect=/phonebook&authTheme=phonebook');
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

    const handleSearchResultClick = (user) => {
        const targetDepartmentId = String(user?.department?.id || '').trim();
        const targetUserId = user?.id;

        if (!targetDepartmentId || !targetUserId) {
            return;
        }

        setSearchQuery('');

        if (isDepartmentPage && String(departmentId) === targetDepartmentId) {
            handleSelectUser(targetUserId);
            return;
        }

        navigate(`/phonebook/${targetDepartmentId}`, { state: { openUserId: targetUserId } });
    };

    const getSearchUserTitle = (user) => {
        const title = String(user?.title || '').trim();
        return title || '-';
    };

    const getSearchUserCity = (user) => {
        const city = String(user?.location || '').trim();
        return city || '-';
    };

    const handleRelatedUserCardOpen = (user) => {
        const targetUserId = getRelatedUserId(user);
        if (!targetUserId) {
            return;
        }

        const targetDepartmentId = getRelatedDepartmentId(user);

        if (targetDepartmentId && isDepartmentPage && String(departmentId) === targetDepartmentId) {
            handleSelectUser(targetUserId);
            return;
        }

        if (targetDepartmentId) {
            navigate(`/phonebook/${targetDepartmentId}`, { state: { openUserId: targetUserId } });
            return;
        }

        handleSelectUser(targetUserId);
    };

    const selectedUserEmail = String(selectedUser?.email || '').trim();
    const selectedUserHeadName = formatFullName(selectedUser?.Head);
    const selectedUserHeadId = getRelatedUserId(selectedUser?.Head);

    const renderSearchResults = () => (
        <main className="phonebook-main phonebook-main-department">
            {error ? <div className="phonebook-error">{error}</div> : null}

            <section className="phonebook-department-content">
                <div aria-hidden className="phonebook-center-image phonebook-center-image-faded">
                    <img src="/background-center.png" alt="" />
                </div>

                <div className="phonebook-department-header-row">
                    {isDepartmentPage ? (
                        <Link to="/phonebook" className="phonebook-back-button">
                            {'\u041d\u0430\u0437\u0430\u0434'}
                        </Link>
                    ) : null}
                    <div className="phonebook-department-title">{'\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043f\u043e\u0438\u0441\u043a\u0430'}</div>
                </div>

                <div className="phonebook-department-list">
                    {!loading && groupedSearchResults.length === 0 ? (
                        <div className="phonebook-department-empty">{'\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e.'}</div>
                    ) : null}

                    {!loading && groupedSearchResults.map((group) => (
                        <section key={group.departmentId || group.departmentName} className="phonebook-search-group">
                            <div className="phonebook-search-group-title">{group.departmentName}</div>
                            <div className="phonebook-search-columns" aria-hidden>
                                <div />
                                <div className="phonebook-search-column-cell">{'\u0424\u0418\u041e'}</div>
                                <div className="phonebook-search-column-cell">{'\u0414\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c'}</div>
                                <div className="phonebook-search-column-cell">{'\u0413\u043e\u0440\u043e\u0434'}</div>
                            </div>
                            {group.users.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    className="phonebook-contact-row phonebook-contact-row-button phonebook-contact-row-search"
                                    onClick={() => handleSearchResultClick(user)}
                                >
                                    <div className="phonebook-contact-avatar">{renderAvatar(user)}</div>
                                    <div className="phonebook-contact-name">{formatFullName(user)}</div>
                                    <div className="phonebook-contact-position">{getSearchUserTitle(user)}</div>
                                    <div className="phonebook-contact-city">{getSearchUserCity(user)}</div>
                                </button>
                            ))}
                        </section>
                    ))}
                </div>
            </section>
        </main>
    );

    const renderDepartmentPage = () => (
        <main className="phonebook-main phonebook-main-department">
            {error ? <div className="phonebook-error">{error}</div> : null}

            <section className="phonebook-department-content">
                <div aria-hidden className="phonebook-center-image phonebook-center-image-faded">
                    <img src="/background-center.png" alt="" />
                </div>

                <div className="phonebook-department-header-row">
                    <Link to="/phonebook" className="phonebook-back-button">
                        {'\u041d\u0430\u0437\u0430\u0434'}
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
                                <div className="phonebook-user-card-avatar-wrap">
                                    <div className="phonebook-user-card-avatar">{renderAvatar(selectedUser, AVATAR_SIZES.card)}</div>
                                    {canEditSelectedUser ? (
                                        <div className="phonebook-user-card-avatar-actions">
                                            <label className={`phonebook-user-card-action-button${isUploadingAvatar ? ' is-disabled' : ''}`}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleAvatarUpload}
                                                    disabled={isUploadingAvatar || isSavingUserCard}
                                                />
                                                <span>{isUploadingAvatar ? 'Загрузка фото...' : 'Загрузить фото'}</span>
                                            </label>
                                        </div>
                                    ) : null}
                                </div>

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
                                        <span>
                                            {selectedUserEmail ? (
                                                <a
                                                    href={`mailto:${selectedUserEmail}`}
                                                    className="phonebook-user-card-value-link"
                                                    title={`mailto:${selectedUserEmail}`}
                                                >
                                                    {selectedUserEmail}
                                                </a>
                                            ) : '-'}
                                        </span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Дата рожд.:</span>
                                        {canEditSelectedUser ? (
                                            <input
                                                type="text"
                                                className="phonebook-user-card-level-input"
                                                value={birthDateDraft}
                                                onChange={(event) => {
                                                    setBirthDateDraft(event.target.value);
                                                    if (birthDateValidationError) {
                                                        setBirthDateValidationError('');
                                                    }
                                                }}
                                                disabled={isSavingUserCard || isUploadingAvatar}
                                                placeholder="1.2 / 01.02 / 01.02.2000"
                                                aria-label="Дата рождения"
                                                inputMode="numeric"
                                            />
                                        ) : (
                                            <span>{toValueOrDash(formatBirthDate(selectedUser?.date_birthd))}</span>
                                        )}
                                    </div>
                                    {canEditSelectedUser && birthDateValidationError ? (
                                        <div className="phonebook-user-card-level-saving">{birthDateValidationError}</div>
                                    ) : null}
                                    <div className="phonebook-user-card-row">
                                        <span>Руководитель:</span>
                                        <span>
                                            {selectedUserHeadName && selectedUserHeadId ? (
                                                <button
                                                    type="button"
                                                    className="phonebook-user-card-value-link phonebook-user-card-value-link-button"
                                                    onClick={() => handleRelatedUserCardOpen(selectedUser?.Head)}
                                                    title="Открыть карточку руководителя"
                                                >
                                                    {selectedUserHeadName}
                                                </button>
                                            ) : toValueOrDash(selectedUserHeadName)}
                                        </span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Город:</span>
                                        <span>{toValueOrDash(selectedUser?.location)}</span>
                                    </div>
                                    {canEditSelectedUser ? (
                                        <div className="phonebook-user-card-row">
                                            <span>Уровень:</span>
                                            <div className="phonebook-user-card-level-edit">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    className="phonebook-user-card-level-input"
                                                    value={levelDraft}
                                                    onChange={handleLevelDraftChange}
                                                    disabled={isUploadingAvatar}
                                                    placeholder="-"
                                                    aria-label="Уровень"
                                                />
                                                {isSavingLevel ? <span className="phonebook-user-card-level-saving">Сохранение...</span> : null}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="phonebook-user-card-extra-title">Доп. сведения:</div>
                            {canEditSelectedUser ? (
                                <div className="phonebook-user-card-extra-edit">
                                    <textarea
                                        className="phonebook-user-card-extra-input"
                                        value={descriptionDraft}
                                        onChange={(event) => setDescriptionDraft(event.target.value)}
                                        disabled={isSavingUserCard || isUploadingAvatar}
                                        placeholder="Введите доп. сведения"
                                    />
                                    <button
                                        type="button"
                                        className="phonebook-user-card-action-button"
                                        onClick={handleUserCardSave}
                                        disabled={isSavingUserCard || isUploadingAvatar}
                                    >
                                        {isSavingUserCard ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </div>
                            ) : (
                                <div className="phonebook-user-card-extra">{toValueOrDash(selectedUser?.description)}</div>
                            )}
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
                    <div className="phonebook-search-wrap">
                        <input
                            className="phonebook-search"
                            placeholder="Поиск"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            aria-label="Поиск по телефонному справочнику"
                        />
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

            {hasSearchQuery ? renderSearchResults() : (isDepartmentPage ? renderDepartmentPage() : renderDepartmentsGrid())}
        </div>
    );
}

export default PhonebookPage;
