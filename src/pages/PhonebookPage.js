import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    fetchPhonebookDepartments,
    fetchPhonebookUserCard,
    fetchPhonebookUsersForSearch,
    fetchTrueConfAddressBookContact,
    fetchPhonebookUsersByDepartment,
    getDirectusAssetUrl,
    getCurrentUser,
    isUserInPolicyByName,
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
const PHONEBOOK_DND_POLICY_NAME = 'HR';
const MAX_AVATAR_SIZE_BYTES = 8 * 1024 * 1024;
const SEARCH_RESULTS_LIMIT = 70;
const AVATAR_SIZES = {
    list: { width: 132, height: 120 },
    card: { width: 480, height: 600 },
    currentUser: { width: 80, height: 80 },
};
const TRUECONF_STATUS_META = Object.freeze({
    [-127]: { label: 'Не определен', tone: 'undefined' },
    [-2]: { label: 'Не активен', tone: 'not-active' },
    [-1]: { label: 'Не определен', tone: 'invalid' },
    0: { label: 'Не в сети', tone: 'offline' },
    1: { label: 'В сети', tone: 'online' },
    2: { label: 'Занят', tone: 'busy' },
    5: { label: 'В конференции', tone: 'multihost' },
});
const TRUECONF_STATUS_LOADING_LABEL = 'Проверка статуса...';
const TRUECONF_STATUS_UNAVAILABLE_LABEL = 'Статус недоступен';

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

const normalizeHidenValue = (value) => {
    if (value === true || value === false) {
        return value;
    }

    if (value === null || value === undefined) {
        return null;
    }

    const text = String(value).trim().toLowerCase();
    if (text === 'true' || text === '1') {
        return true;
    }

    if (text === 'false' || text === '0') {
        return false;
    }

    return null;
};

const canShowUserByHidenFlag = (user) => normalizeHidenValue(user?.hiden) !== false;

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

const appendUniqueTrueConfIdentifier = (target, rawValue) => {
    const sourceValue = String(rawValue ?? '').trim();
    if (!sourceValue) {
        return;
    }

    const pathParts = sourceValue.split(/[/\\]/);
    const withoutPath = String(pathParts[pathParts.length - 1] || '').trim();
    const withoutDomain = withoutPath.includes('@')
        ? String(withoutPath.split('@')[0] || '').trim()
        : withoutPath;

    if (!withoutDomain) {
        return;
    }

    // Skip UUID-like identifiers for TrueConf status endpoint: login is expected here.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(withoutDomain)) {
        return;
    }

    // Keep only login-safe symbols to avoid invalid contact/user id probes.
    if (!/^[a-zA-Z0-9._-]+$/.test(withoutDomain)) {
        return;
    }

    if (!target.includes(withoutDomain)) {
        target.push(withoutDomain);
    }
};

const collectTrueConfUserIdentifiers = (user) => {
    const identifiers = [];

    if (!user) {
        return identifiers;
    }

    if (typeof user !== 'object') {
        appendUniqueTrueConfIdentifier(identifiers, user);
        return identifiers;
    }

    appendUniqueTrueConfIdentifier(identifiers, user?.userId);
    appendUniqueTrueConfIdentifier(identifiers, user?.trueconf_user_id);
    appendUniqueTrueConfIdentifier(identifiers, user?.trueconfUserId);
    appendUniqueTrueConfIdentifier(identifiers, user?.trueconf_id);
    appendUniqueTrueConfIdentifier(identifiers, user?.trueconfId);
    appendUniqueTrueConfIdentifier(identifiers, user?.trueconf_login);
    appendUniqueTrueConfIdentifier(identifiers, user?.trueconfLogin);
    appendUniqueTrueConfIdentifier(identifiers, user?.login_name);
    appendUniqueTrueConfIdentifier(identifiers, user?.login);
    appendUniqueTrueConfIdentifier(identifiers, user?.uid);
    appendUniqueTrueConfIdentifier(identifiers, user?.email);
    appendUniqueTrueConfIdentifier(identifiers, user?.username);
    appendUniqueTrueConfIdentifier(identifiers, user?.id);

    return identifiers.slice(0, 1);
};

const getTrueConfStatusMeta = (rawStatus) => {
    const numericStatus = Number(rawStatus);
    if (!Number.isFinite(numericStatus)) {
        return null;
    }

    return TRUECONF_STATUS_META[numericStatus] || null;
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
    const [hasPhonebookEditPolicy, setHasPhonebookEditPolicy] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [descriptionDraft, setDescriptionDraft] = useState('');
    const [levelDraft, setLevelDraft] = useState('');
    const [birthDateDraft, setBirthDateDraft] = useState('');
    const [birthDateValidationError, setBirthDateValidationError] = useState('');
    const [isSavingUserCard, setIsSavingUserCard] = useState(false);
    const [isSavingHidenFlag, setIsSavingHidenFlag] = useState(false);
    const [isSavingLevel, setIsSavingLevel] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchUsers, setSearchUsers] = useState([]);
    const [userCardBackStack, setUserCardBackStack] = useState([]);
    const [selectedUserTrueConfStatus, setSelectedUserTrueConfStatus] = useState('');
    const [selectedUserTrueConfStatusTone, setSelectedUserTrueConfStatusTone] = useState('unknown');
    const [selectedUserTrueConfDialUser, setSelectedUserTrueConfDialUser] = useState('');
    const [isSelectedUserTrueConfStatusLoading, setIsSelectedUserTrueConfStatusLoading] = useState(false);
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
                try {
                    await getToken();
                } catch (refreshError) {
                    // Ignore and continue with /users/me probe.
                }

                const user = await getCurrentUser();
                const canEditByPolicy = user?.id
                    ? await isUserInPolicyByName(user.id, PHONEBOOK_DND_POLICY_NAME)
                    : false;

                if (active) {
                    setCurrentUser(user || null);
                    setHasPhonebookEditPolicy(Boolean(canEditByPolicy));
                }
            } catch (authError) {
                if (active) {
                    setCurrentUser(null);
                    setHasPhonebookEditPolicy(false);
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
        if (isAuthLoading) {
            return undefined;
        }

        let active = true;
        const includeHidden = hasPhonebookEditPolicy;

        const loadData = async () => {
            setLoading(true);
            setError('');

            try {
                if (isDepartmentPage) {
                    const [departmentData, usersData, allUsersData] = await Promise.all([
                        fetchPhonebookDepartments(),
                        fetchPhonebookUsersByDepartment(departmentId, { includeHidden }),
                        fetchPhonebookUsersForSearch({ includeHidden }),
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
                            const cardUser = await fetchPhonebookUserCard(autoOpenUser.id, { includeHidden });
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
                        fetchPhonebookUsersForSearch({ includeHidden }),
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
    }, [departmentId, hasPhonebookEditPolicy, isAuthLoading, isDepartmentPage, searchResultUserId]);

    const slotsMap = useMemo(() => buildSlotsMap(departments), [departments]);
    const canEditSelectedUser = useMemo(
        () => !isAuthLoading
            && Boolean(currentUser)
            && hasPhonebookEditPolicy,
        [currentUser, hasPhonebookEditPolicy, isAuthLoading],
    );
    const activeDepartment = useMemo(
        () => departments.find((department) => String(department.id) === String(departmentId)),
        [departments, departmentId],
    );
    const visibleDepartmentUsers = useMemo(
        () => (hasPhonebookEditPolicy ? users : users.filter(canShowUserByHidenFlag)),
        [hasPhonebookEditPolicy, users],
    );
    const visibleSearchUsers = useMemo(
        () => (hasPhonebookEditPolicy ? searchUsers : searchUsers.filter(canShowUserByHidenFlag)),
        [hasPhonebookEditPolicy, searchUsers],
    );
    const normalizedQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
    const hasSearchQuery = normalizedQuery.length > 0;
    const searchResults = useMemo(() => {
        if (!hasSearchQuery) {
            return [];
        }

        return visibleSearchUsers
            .filter((user) => {
                const fullName = normalizeSearchText(formatFullName(user));
                const title = normalizeSearchText(user?.title);
                const location = normalizeSearchText(user?.location);

                return fullName.includes(normalizedQuery)
                    || title.includes(normalizedQuery)
                    || location.includes(normalizedQuery);
            })
            .slice(0, SEARCH_RESULTS_LIMIT);
    }, [hasSearchQuery, normalizedQuery, visibleSearchUsers]);
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

    const selectedUserTrueConfIdentifiers = useMemo(
        () => collectTrueConfUserIdentifiers(selectedUser),
        [selectedUser],
    );
    const currentUserTrueConfIdentifiers = useMemo(
        () => collectTrueConfUserIdentifiers(currentUser),
        [currentUser],
    );
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

    const getCurrentViewSnapshot = () => ({
        departmentId: isDepartmentPage ? String(departmentId || '') : '',
        userId: selectedUser?.id ? String(selectedUser.id) : '',
    });

    const isSameView = (left, right) => (
        String(left?.departmentId || '') === String(right?.departmentId || '')
        && String(left?.userId || '') === String(right?.userId || '')
    );

    const pushCurrentViewToBackStack = () => {
        setUserCardBackStack((prevStack) => {
            const currentView = getCurrentViewSnapshot();
            const lastView = prevStack[prevStack.length - 1];

            if (isSameView(lastView, currentView)) {
                return prevStack;
            }

            return [...prevStack, currentView];
        });
    };

    const handleSelectUser = async (userId, options = {}) => {
        const { rememberCurrentView = false } = options;
        if (rememberCurrentView) {
            pushCurrentViewToBackStack();
        }

        setSelectedUserLoading(true);
        setSelectedUserError('');

        try {
            const cardUser = await fetchPhonebookUserCard(userId, { includeHidden: hasPhonebookEditPolicy });
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

    useEffect(() => {
        let active = true;

        const fallbackDialUser = selectedUserTrueConfIdentifiers[0] || '';
        setSelectedUserTrueConfDialUser(fallbackDialUser);
        setSelectedUserTrueConfStatus('');
        setSelectedUserTrueConfStatusTone('unknown');
        setIsSelectedUserTrueConfStatusLoading(false);

        const loadTrueConfStatus = async () => {
            if (!selectedUser?.id || !currentUserTrueConfIdentifiers.length || !selectedUserTrueConfIdentifiers.length) {
                return;
            }

            setIsSelectedUserTrueConfStatusLoading(true);

            try {
                const statusResponse = await fetchTrueConfAddressBookContact({
                    userIds: currentUserTrueConfIdentifiers,
                    contactIds: selectedUserTrueConfIdentifiers,
                });

                if (!active) {
                    return;
                }

                const contactPayload = statusResponse?.contact || null;
                if (!contactPayload) {
                    setSelectedUserTrueConfStatus('');
                    setSelectedUserTrueConfStatusTone('unavailable');
                    setSelectedUserTrueConfDialUser(fallbackDialUser);
                    return;
                }

                const contactUser = contactPayload?.user && typeof contactPayload.user === 'object'
                    ? contactPayload.user
                    : contactPayload;
                const resolvedStatusMeta = getTrueConfStatusMeta(contactUser?.status ?? contactPayload?.status);
                const resolvedDialUser = collectTrueConfUserIdentifiers(contactUser)[0] || fallbackDialUser;

                setSelectedUserTrueConfStatus(resolvedStatusMeta?.label || '');
                setSelectedUserTrueConfStatusTone(resolvedStatusMeta?.tone || 'unknown');
                setSelectedUserTrueConfDialUser(resolvedDialUser);
            } catch (statusError) {
                if (!active) {
                    return;
                }

                console.error('Phonebook: failed to load TrueConf status', statusError);
                setSelectedUserTrueConfStatus('');
                setSelectedUserTrueConfStatusTone('unavailable');
                setSelectedUserTrueConfDialUser(fallbackDialUser);
            } finally {
                if (active) {
                    setIsSelectedUserTrueConfStatusLoading(false);
                }
            }
        };

        void loadTrueConfStatus();

        return () => {
            active = false;
        };
    }, [
        selectedUser?.id,
        currentUserTrueConfIdentifiers,
        selectedUserTrueConfIdentifiers,
    ]);

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

    const handleHidenFlagChange = async (event) => {
        if (!canEditSelectedUser || !selectedUser?.id || isSavingHidenFlag) {
            return;
        }

        const nextHidenValue = Boolean(event.target.checked);
        setSelectedUserError('');
        setIsSavingHidenFlag(true);

        try {
            await updatePhonebookUserCard(selectedUser.id, { hiden: nextHidenValue });

            setSelectedUser((prevUser) => (
                prevUser
                    ? {
                        ...prevUser,
                        hiden: nextHidenValue,
                    }
                    : prevUser
            ));
            setUsers((prevUsers) => prevUsers.map((user) => (
                String(user.id) === String(selectedUser.id)
                    ? { ...user, hiden: nextHidenValue }
                    : user
            )));
            setSearchUsers((prevUsers) => prevUsers.map((user) => (
                String(user.id) === String(selectedUser.id)
                    ? { ...user, hiden: nextHidenValue }
                    : user
            )));
        } catch (saveError) {
            console.error('Phonebook: failed to save hiden flag', saveError);
            setSelectedUserError('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.');
        } finally {
            setIsSavingHidenFlag(false);
        }
    };

    const handleUserCardSave = async () => {
        if (!canEditSelectedUser || !selectedUser?.id || isSavingUserCard || isSavingHidenFlag) {
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

        if (!file || !canEditSelectedUser || !selectedUser?.id || isDeletingAvatar || isSavingHidenFlag) {
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

    const handleAvatarDelete = async () => {
        if (!canEditSelectedUser || !selectedUser?.id || isUploadingAvatar || isDeletingAvatar || isSavingUserCard || isSavingHidenFlag) {
            return;
        }

        const currentAvatarValue = selectedUser?.avatar;
        const currentAvatarId = typeof currentAvatarValue === 'object'
            ? currentAvatarValue?.id
            : currentAvatarValue;

        if (!currentAvatarId) {
            return;
        }

        setSelectedUserError('');
        setIsDeletingAvatar(true);

        try {
            await updatePhonebookUserCard(selectedUser.id, { avatar: null });

            setSelectedUser((prevUser) => (prevUser ? { ...prevUser, avatar: null } : prevUser));
            setUsers((prevUsers) => prevUsers.map((user) => (
                String(user.id) === String(selectedUser.id)
                    ? { ...user, avatar: null }
                    : user
            )));
            setSearchUsers((prevUsers) => prevUsers.map((user) => (
                String(user.id) === String(selectedUser.id)
                    ? { ...user, avatar: null }
                    : user
            )));
        } catch (deleteError) {
            console.error('Phonebook: failed to delete avatar', deleteError);
            setSelectedUserError('Не удалось удалить фото сотрудника.');
        } finally {
            setIsDeletingAvatar(false);
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
            setHasPhonebookEditPolicy(false);
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
            handleSelectUser(targetUserId, { rememberCurrentView: true });
            return;
        }

        pushCurrentViewToBackStack();
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

        if (selectedUser?.id && String(selectedUser.id) === targetUserId && (!targetDepartmentId || String(departmentId) === targetDepartmentId)) {
            return;
        }

        if (targetDepartmentId && isDepartmentPage && String(departmentId) === targetDepartmentId) {
            handleSelectUser(targetUserId, { rememberCurrentView: true });
            return;
        }

        if (targetDepartmentId) {
            if (selectedUser) {
                pushCurrentViewToBackStack();
            }
            navigate(`/phonebook/${targetDepartmentId}`, { state: { openUserId: targetUserId } });
            return;
        }

        handleSelectUser(targetUserId, { rememberCurrentView: true });
    };

    const restoreView = (view) => {
        const targetDepartmentId = String(view?.departmentId || '');
        const targetUserId = String(view?.userId || '');

        if (!targetDepartmentId) {
            setSelectedUser(null);
            setSelectedUserError('');
            navigate('/phonebook');
            return;
        }

        if (targetDepartmentId !== String(departmentId)) {
            if (targetUserId) {
                navigate(`/phonebook/${targetDepartmentId}`, { state: { openUserId: targetUserId } });
            } else {
                navigate(`/phonebook/${targetDepartmentId}`);
            }
            return;
        }

        if (targetUserId) {
            handleSelectUser(targetUserId);
            return;
        }

        setSelectedUser(null);
        setSelectedUserError('');
    };

    const handleBackClick = () => {
        const previousView = userCardBackStack[userCardBackStack.length - 1];

        if (previousView) {
            setUserCardBackStack((prevStack) => prevStack.slice(0, -1));
            restoreView(previousView);
            return;
        }

        if (selectedUser) {
            if (isDepartmentPage && visibleDepartmentUsers.length === 1) {
                navigate('/phonebook');
                return;
            }

            setSelectedUser(null);
            setSelectedUserError('');
            return;
        }

        if (isDepartmentPage) {
            navigate('/phonebook');
            return;
        }

        setUserCardBackStack([]);
    };

    const selectedUserEmail = String(selectedUser?.email || '').trim();
    const selectedUserPhone = String(selectedUser?.phone || '').trim();
    const selectedUserPhoneForTrueConf = selectedUserPhone.replace(/[^\d+]/g, '');
    const selectedUserPhoneTrueConfHref = selectedUserPhoneForTrueConf
        ? `trueconf:#tel:${selectedUserPhoneForTrueConf}`
        : '';
    const selectedUserAvatarValue = selectedUser?.avatar;
    const selectedUserAvatarId = typeof selectedUserAvatarValue === 'object'
        ? selectedUserAvatarValue?.id
        : selectedUserAvatarValue;
    const hasSelectedUserAvatar = Boolean(selectedUserAvatarId);
    const selectedUserHidenValue = normalizeHidenValue(selectedUser?.hiden);
    const isSelectedUserVisibleForRegularUsers = selectedUserHidenValue !== false;
    const isAvatarActionInProgress = isUploadingAvatar || isDeletingAvatar || isSavingUserCard || isSavingHidenFlag;
    const isHidenToggleDisabled = isSavingHidenFlag || isSavingUserCard || isUploadingAvatar || isDeletingAvatar;
    const selectedUserMobile = String(selectedUser?.mobile || '').trim();
    const selectedUserMobileForTrueConf = selectedUserMobile.replace(/[^\d+]/g, '');
    const selectedUserMobileTrueConfHref = selectedUserMobileForTrueConf
        ? `trueconf:#tel:${selectedUserMobileForTrueConf}`
        : '';
    const selectedUserTrueConfUser = String(selectedUserTrueConfDialUser || selectedUserTrueConfIdentifiers[0] || '').trim();
    const selectedUserTrueConfHref = selectedUserTrueConfUser
        ? `trueconf:${selectedUserTrueConfUser}`
        : '';
    const selectedUserTrueConfText = isSelectedUserTrueConfStatusLoading
        ? TRUECONF_STATUS_LOADING_LABEL
        : (selectedUserTrueConfStatus || (selectedUserTrueConfHref ? TRUECONF_STATUS_UNAVAILABLE_LABEL : ''));
    const selectedUserTrueConfTone = isSelectedUserTrueConfStatusLoading
        ? 'loading'
        : (selectedUserTrueConfStatus
            ? selectedUserTrueConfStatusTone
            : (selectedUserTrueConfHref ? 'unavailable' : 'unknown'));
    const selectedUserTrueConfStatusNode = selectedUserTrueConfText
        ? (
            <span className="phonebook-trueconf-status">
                <span
                    aria-hidden
                    className={`phonebook-trueconf-status-dot phonebook-trueconf-status-dot-${selectedUserTrueConfTone}`}
                />
                <span>{selectedUserTrueConfText}</span>
            </span>
        )
        : '-';
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
                        <button type="button" className="phonebook-back-button" onClick={handleBackClick}>
                            {'\u041d\u0430\u0437\u0430\u0434'}
                        </button>
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
                    <button type="button" className="phonebook-back-button" onClick={handleBackClick}>
                        {'\u041d\u0430\u0437\u0430\u0434'}
                    </button>
                    <div className="phonebook-department-title">{departmentTitle}</div>
                </div>

                <div className="phonebook-department-list">
                    {loading ? (
                        <div className="phonebook-department-empty">Загрузка...</div>
                    ) : null}

                    {!loading && visibleDepartmentUsers.length === 0 && !error ? (
                        <div className="phonebook-department-empty">В этом отделе пока нет сотрудников.</div>
                    ) : null}

                    {!loading && selectedUserError ? (
                        <div className="phonebook-department-empty">{selectedUserError}</div>
                    ) : null}

                    {!loading && !selectedUser && visibleDepartmentUsers.map((user) => (
                        <button
                            key={user.id}
                            type="button"
                            className="phonebook-contact-row phonebook-contact-row-button"
                            onClick={() => handleSelectUser(user.id, { rememberCurrentView: true })}
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

                            <div className="phonebook-user-card-main">
                                <div className="phonebook-user-card-avatar-wrap">
                                    <div className="phonebook-user-card-avatar">
                                        {renderAvatar(selectedUser, AVATAR_SIZES.card)}
                                        {canEditSelectedUser ? (
                                            <div className="phonebook-user-card-avatar-actions">
                                                <label className={`phonebook-user-card-action-button${isAvatarActionInProgress ? ' is-disabled' : ''}`}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleAvatarUpload}
                                                        disabled={isAvatarActionInProgress}
                                                    />
                                                    <span>{isUploadingAvatar ? 'Загрузка фото...' : 'Загрузить фото'}</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    className="phonebook-user-card-action-button phonebook-user-card-action-button-danger"
                                                    onClick={handleAvatarDelete}
                                                    disabled={isAvatarActionInProgress || !hasSelectedUserAvatar}
                                                >
                                                    {isDeletingAvatar ? 'Удаление...' : 'Удалить фото'}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
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
                                        <span>
                                            {selectedUserPhoneTrueConfHref ? (
                                                <a
                                                    href={selectedUserPhoneTrueConfHref}
                                                    className="phonebook-user-card-value-link"
                                                    title={selectedUserPhoneTrueConfHref}
                                                >
                                                    {selectedUserPhone}
                                                </a>
                                            ) : '-'}
                                        </span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>Моб. тел.:</span>
                                        <span>
                                            {selectedUserMobileTrueConfHref ? (
                                                <a
                                                    href={selectedUserMobileTrueConfHref}
                                                    className="phonebook-user-card-value-link"
                                                    title={selectedUserMobileTrueConfHref}
                                                >
                                                    {selectedUserMobile}
                                                </a>
                                            ) : '-'}
                                        </span>
                                    </div>
                                    <div className="phonebook-user-card-row">
                                        <span>TrueConf:</span>
                                        <span>
                                            {selectedUserTrueConfHref ? (
                                                <a
                                                    href={selectedUserTrueConfHref}
                                                    className="phonebook-user-card-value-link"
                                                    title={selectedUserTrueConfHref}
                                                >
                                                    {selectedUserTrueConfStatusNode}
                                                </a>
                                            ) : selectedUserTrueConfStatusNode}
                                        </span>
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
                                                disabled={isSavingUserCard || isAvatarActionInProgress}
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
                                            <span>{'\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c:'}</span>
                                            <label className={`phonebook-user-card-toggle${isHidenToggleDisabled ? ' is-disabled' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className="phonebook-user-card-toggle-input"
                                                    checked={isSelectedUserVisibleForRegularUsers}
                                                    onChange={handleHidenFlagChange}
                                                    disabled={isHidenToggleDisabled}
                                                    aria-label={'\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c \u0432 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u043d\u043e\u0439 \u043a\u043d\u0438\u0433\u0435'}
                                                />
                                                <div aria-hidden className="phonebook-user-card-toggle-track" />
                                                <div className="phonebook-user-card-toggle-text">
                                                    {isSelectedUserVisibleForRegularUsers
                                                        ? '\u0412\u0438\u0434\u0435\u043d \u0434\u043b\u044f \u0432\u0441\u0435\u0445'
                                                        : '\u0421\u043a\u0440\u044b\u0442 \u0434\u043b\u044f \u043e\u0431\u044b\u0447\u043d\u044b\u0445 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439'}
                                                </div>
                                            </label>
                                        </div>
                                    ) : null}
                                    {canEditSelectedUser && isSavingHidenFlag ? (
                                        <div className="phonebook-user-card-level-saving">{'\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...'}</div>
                                    ) : null}
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
                                                    disabled={isAvatarActionInProgress}
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
                                        disabled={isSavingUserCard || isAvatarActionInProgress}
                                        placeholder="Введите доп. сведения"
                                    />
                                    <button
                                        type="button"
                                        className="phonebook-user-card-action-button"
                                        onClick={handleUserCardSave}
                                        disabled={isSavingUserCard || isAvatarActionInProgress}
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
                                            onClick={pushCurrentViewToBackStack}
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
