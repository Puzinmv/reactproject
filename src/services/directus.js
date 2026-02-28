import {
    createDirectus, authentication,  rest,
    readItems, readUsers, updateItem, readMe, readFile, readItem,
    uploadFiles, deleteFile, createItem, updateMe, deleteItem, updateUser
} from "@directus/sdk";

const directusBaseUrl = new URL(process.env.REACT_APP_API_URL || '', window.location.origin).toString();

export const directus = createDirectus(directusBaseUrl)
    .with(authentication('session', { credentials: 'include', autoRefresh: true }))
    .with(rest({ credentials: 'include' }))
    ;

export const getDirectusAssetUrl = (fileId, { width, height, fit = 'cover' } = {}) => {
    if (!fileId) {
        return '';
    }

    const normalizedBaseUrl = String(directusBaseUrl || '').replace(/\/+$/, '');
    const assetUrl = new URL(`${normalizedBaseUrl}/assets/${fileId}`);

    if (Number.isFinite(width) && width > 0) {
        assetUrl.searchParams.set('width', String(Math.trunc(width)));
    }

    if (Number.isFinite(height) && height > 0) {
        assetUrl.searchParams.set('height', String(Math.trunc(height)));
    }

    if (fit) {
        assetUrl.searchParams.set('fit', fit);
    }

    return assetUrl.toString();
};

// Вспомогательные функции для сортировки
const extractGroupNumber = (activityName) => {
    if (!activityName || typeof activityName !== 'string') {
        return 999; // Группы без номера идут в конец
    }
    const match = activityName.match(/^(\d+)\./);
    return match ? parseInt(match[1], 10) : 999;
};

const parseVersionNumber = (numberStr) => {
    if (!numberStr || typeof numberStr !== 'string') {
        return [];
    }
    return numberStr.split('.').map(part => {
        const num = parseInt(part.trim(), 10);
        return isNaN(num) ? 0 : num;
    });
};

const compareVersionNumbers = (a, b) => {
    const partsA = parseVersionNumber(a);
    const partsB = parseVersionNumber(b);
    const maxLength = Math.max(partsA.length, partsB.length);
    
    for (let i = 0; i < maxLength; i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;
        if (partA !== partB) {
            return partA - partB;
        }
    }
    return 0;
};

export const loginEmail = async (email, password) => {
    try {
        const user = await directus.login(email, password);
        return user;
    } catch (e) {
        console.error(e)
    }

};

export const loginAD = async (login, password) => {
    try {
        //const user = await directus.login(email, password);
        const response = await fetch(process.env.REACT_APP_API_URL +'/auth/login/ldap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                identifier: login,
                password: password,
                mode: "session"
            })
        });
        if (response.ok) {
            const result = await response.json();
            if (window.location.hostname === 'localhost') {
                directus.setToken(result.data.access_token);
                console.log('localhost',result)
            }
            //const token = await getToken()
            return true;
        } else {
            return null;
        }

    } catch (e) {
        console.error(e)
    }

};


export const getToken = async () => {
    try {
        const response = await fetch(process.env.REACT_APP_API_URL+'/auth/refresh', {
            method: 'POST',
            credentials: 'include', 
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'session' })
        });
        
        if (!response.ok) {
            throw new Error('Token refresh failed');
        }
        
        const data = await response.json();
        return data;
    } catch (e) {
        console.error(e);
        throw e;
    }
};

const normalizePolicyId = (value) => String(value ?? '').trim();
const normalizePolicyName = (value) => String(value ?? '').trim();

const extractPolicyCandidate = (policy) => {
    if (!policy) {
        return null;
    }

    if (typeof policy === 'string' || typeof policy === 'number') {
        const id = normalizePolicyId(policy);
        return id ? { id, name: '' } : null;
    }

    if (typeof policy !== 'object') {
        return null;
    }

    const nestedPolicy =
        (policy?.directus_policies_id && typeof policy.directus_policies_id === 'object' && policy.directus_policies_id)
        || (policy?.policies_id && typeof policy.policies_id === 'object' && policy.policies_id)
        || (policy?.policy && typeof policy.policy === 'object' && policy.policy)
        || null;

    const rawId = policy?.id
        ?? policy?.policy
        ?? policy?.policies_id
        ?? policy?.directus_policies_id
        ?? nestedPolicy?.id
        ?? '';
    const rawName = policy?.name
        ?? nestedPolicy?.name
        ?? '';

    const id = normalizePolicyId(rawId);
    const name = normalizePolicyName(rawName);

    if (!id && !name) {
        return null;
    }

    return { id, name };
};

const mergePolicyCandidate = (map, candidate) => {
    if (!candidate || (!candidate.id && !candidate.name)) {
        return;
    }

    const key = candidate.id || `name:${candidate.name.toLocaleLowerCase('ru')}`;
    const existing = map.get(key);

    if (!existing) {
        map.set(key, {
            id: candidate.id || '',
            name: candidate.name || '',
        });
        return;
    }

    if (!existing.id && candidate.id) {
        existing.id = candidate.id;
    }

    if (!existing.name && candidate.name) {
        existing.name = candidate.name;
    }
};

const normalizeUserPolicies = async (user) => {
    const policies = Array.isArray(user?.policies) ? user.policies : [];
    const policyMap = new Map();

    policies.forEach((policy) => {
        mergePolicyCandidate(policyMap, extractPolicyCandidate(policy));
    });

    const idsWithoutName = Array.from(policyMap.values())
        .filter((item) => item.id && !item.name)
        .map((item) => item.id);

    if (idsWithoutName.length > 0) {
        try {
            const resolvedPolicies = await directus.request(readItems('directus_policies', {
                fields: ['id', 'name'],
                filter: {
                    id: {
                        _in: idsWithoutName,
                    },
                },
                limit: -1,
            }));

            if (Array.isArray(resolvedPolicies)) {
                resolvedPolicies.forEach((policy) => {
                    mergePolicyCandidate(policyMap, {
                        id: normalizePolicyId(policy?.id),
                        name: normalizePolicyName(policy?.name),
                    });
                });
            }
        } catch (error) {
            console.warn('Directus: failed to resolve policy names for current user', error);
        }
    }

    return {
        ...user,
        policies: Array.from(policyMap.values()),
    };
};

export const getCurrentUser = async () => {
    try {
        const user = await directus.request(readMe());
        if (!user) {
            throw new Error('Failed to get user data');
        }
        return await normalizeUserPolicies(user);
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const fetchPhonebookDepartments = async () => {
    const data = await directus.request(readItems('LADP_departments', {
        fields: ['id', 'name', 'sort'],
        limit: -1,
    }));

    return Array.isArray(data) ? data : [];
};

export const fetchPhonebookUsersByDepartment = async (departmentId) => {
    if (!departmentId) {
        return [];
    }

    const users = await directus.request(readUsers({
        fields: ['id', 'first_name', 'last_name', 'middleName', 'title', 'avatar', 'department', 'level'],
        filter: {
            _and: [
                {
                    status: {
                        _eq: 'active',
                    },
                },
                {
                    department: {
                        _eq: departmentId,
                    },
                },
            ],
        },
        limit: -1,
    }));

    if (!Array.isArray(users)) {
        return [];
    }

    const collator = new Intl.Collator('ru', { sensitivity: 'base' });
    const normalizeLevel = (value) => {
        if (value === null || value === undefined || String(value).trim() === '') {
            return null;
        }

        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return { type: 'number', value: numeric };
        }

        return { type: 'string', value: String(value).trim() };
    };

    return [...users].sort((a, b) => {
        const levelA = normalizeLevel(a?.level);
        const levelB = normalizeLevel(b?.level);

        if (levelA === null && levelB !== null) {
            return 1;
        }
        if (levelA !== null && levelB === null) {
            return -1;
        }
        if (levelA !== null && levelB !== null) {
            if (levelA.type === 'number' && levelB.type === 'number' && levelA.value !== levelB.value) {
                return levelA.value - levelB.value;
            }
            if (levelA.type !== 'number' || levelB.type !== 'number') {
                const levelCompare = collator.compare(String(levelA.value), String(levelB.value));
                if (levelCompare !== 0) {
                    return levelCompare;
                }
            }
        }

        const lastNameCompare = collator.compare(a?.last_name || '', b?.last_name || '');
        if (lastNameCompare !== 0) {
            return lastNameCompare;
        }

        const firstNameCompare = collator.compare(a?.first_name || '', b?.first_name || '');
        if (firstNameCompare !== 0) {
            return firstNameCompare;
        }

        return collator.compare(a?.middleName || '', b?.middleName || '');
    });
};

export const fetchPhonebookUsersForSearch = async () => {
    const users = await directus.request(readUsers({
        fields: [
            'id',
            'first_name',
            'last_name',
            'middleName',
            'title',
            'avatar',
            'location',
            { department: ['id', 'name'] },
        ],
        filter: {
            _and: [
                {
                    status: {
                        _eq: 'active',
                    },
                },
                {
                    department: {
                        _nnull: true,
                    },
                },
            ],
        },
        limit: -1,
    }));

    if (!Array.isArray(users)) {
        return [];
    }

    const collator = new Intl.Collator('ru', { sensitivity: 'base' });

    return [...users].sort((a, b) => {
        const departmentNameCompare = collator.compare(
            a?.department?.name || '',
            b?.department?.name || '',
        );
        if (departmentNameCompare !== 0) {
            return departmentNameCompare;
        }

        const lastNameCompare = collator.compare(a?.last_name || '', b?.last_name || '');
        if (lastNameCompare !== 0) {
            return lastNameCompare;
        }

        const firstNameCompare = collator.compare(a?.first_name || '', b?.first_name || '');
        if (firstNameCompare !== 0) {
            return firstNameCompare;
        }

        return collator.compare(a?.middleName || '', b?.middleName || '');
    });
};

export const fetchPhonebookUserCard = async (userId) => {
    if (!userId) {
        return null;
    }

    const users = await directus.request(readUsers({
        fields: [
            'id',
            'first_name',
            'last_name',
            'middleName',
            'title',
            'avatar',
            'phone',
            'mobile',
            'email',
            'description',
            'level',
            'date_birthd',
            'location',
            { Head: ['id', 'first_name', 'last_name', 'middleName', { department: ['id'] }] },
        ],
        filter: {
            _and: [
                {
                    id: {
                        _eq: userId,
                    },
                },
                {
                    status: {
                        _eq: 'active',
                    },
                },
            ],
        },
        limit: 1,
    }));

    if (!Array.isArray(users) || users.length === 0) {
        return null;
    }

    return users[0];
};

export const uploadPhonebookUserAvatar = async (file) => {
    if (!file) {
        throw new Error('Avatar file is required');
    }

    const formData = new FormData();
    formData.append('folder', '6b1c5409-c44e-48c3-871a-e058bbac1934');
    formData.append('file', file);
    const response = await directus.request(uploadFiles(formData));

    if (Array.isArray(response)) {
        return response[0] || null;
    }

    return response;
};

export const updatePhonebookUserCard = async (userId, {
    description,
    avatar,
    level,
    date_birthd,
} = {}) => {
    if (!userId) {
        throw new Error('User id is required');
    }

    const payload = {};

    if (description !== undefined) {
        payload.description = description;
    }

    if (avatar !== undefined) {
        payload.avatar = avatar;
    }

    if (level !== undefined) {
        payload.level = level;
    }

    if (date_birthd !== undefined) {
        payload.date_birthd = date_birthd;
    }

    if (Object.keys(payload).length === 0) {
        return null;
    }

    return directus.request(updateUser(userId, payload));
};

export const fetchDatanew = async ({
    page = 1,
    limit = 10,
    sort = '-id',
    search = '',
    filters = {},
    currentUser = null
}) => {
    try {
        const fields = [
            '*',
            {
                user_created: ['id', 'first_name', 'last_name']
            },
            {
                user_updated: ['id', 'first_name', 'last_name']
            },
            {
                initiator: ['id', 'first_name', 'last_name', 'Head', 'RefKey_1C']
            },
            {
                Department: ['*']
            },
            {
                Files: ['*']
            },
        ]

        // Формируем фильтры
        let filter = {"_and": [{},{},{}]};
        
        // Глобальный поиск
        if (search) {
            filter._and[0] = {
                "_or": [
                    { 
                        title: { _icontains: search }
                    },
                    { 
                        Description: { _icontains: search }
                    },
                    { 
                        initiator: {
                            first_name: { _icontains: search }
                        }
                    },
                    {
                        Customer: { _icontains: search }
                    }
                ]
            }
        }

        // Фильтры колонок
        if (filters) {
            let fieldFilter = []
            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    if (key === 'initiator') {
                        fieldFilter.push({
                            [key]: {
                                id: { _eq: value }
                            }
                        });
                    } else if (key === 'Department') {
                        fieldFilter.push({
                            [key]: {
                                Department: { _icontains: value }
                            }
                        });
                    } else if (key === 'status' && Array.isArray(value)) {
                        fieldFilter.push({
                            _or: value.map(status => ({
                                status: { _eq: status }
                            }))
                        });
                    } else {
                        fieldFilter.push({ [key]: { _icontains: value }});
                    }
                }
            });
            filter._and[2]._and = fieldFilter
        }
        // Фильтр "Мои карты"
        if (currentUser) {
            filter._and[3] = {
                "_or": [
                    {   initiator: { id: { _eq: currentUser.id } } },
                    {
                        Department: {
                            email: { _icontains: currentUser.email }
                        }
                    }
                ]}
        }
        const [data, countData] = await Promise.all([
            directus.request(readItems('Project_Card', {
                fields,
                filter,
                sort: [sort],
                page,
                limit
            })),
            // Отдельный запрос для получения общего количества с учетом фильтров
            directus.request(readItems('Project_Card', {
                aggregate: {
                    count: '*'
                },
                filter
            }))
        ]);
        //console.log(data, countData)
        return {
            data,
            meta: {
                total: countData[0].count,
                page,
                limit
            }
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const fetchInitData = async () => {
    const [initiatorIds, Department] = await Promise.all([
        directus.request(readItems('Project_Card', {
            groupBy: ['initiator'],
            filter: {
                initiator: { 
                    _nnull: true,
                    first_name: { _nnull: true }
                }
            }
        })),
        directus.request(readItems('Department', { fields: ['*'] })),
    ]);
    const uniqueInitiatorIds = initiatorIds.map(item => item.initiator).filter(Boolean);

    const Users = await directus.request(readUsers({
        fields: ['id', 'first_name', 'last_name'],
        filter: {
            id: {
                _in: uniqueInitiatorIds
            }
        }
    }));
    return [Users, Department]
    
}

export const fetchInitGrade = async () => {
    try {
        const [presaleUsers, gradesData, allGradesWithUsers, averageGrades, closedMonths] = await Promise.all([
            directus.request(readItems('PresaleUsers', {
                fields: ['*', { user: ['id', 'first_name'] }]
            })),
            directus.request(readItems('gradePresale', {
                fields: ['*'],
                filter: {
                    user_created: {
                        _eq: '$CURRENT_USER'
                    }
                },
                sort: ['-date_created']
            })),
            directus.request(readItems('gradePresale', {
                fields: ['*', {
                    user_created: ['id', 'first_name'],
                    user_updated: ['id', 'first_name'],
                }],
                filter: {
                    dateGrade: {
                        _nnull: true
                    }
                },
                sort: ['-date_created']
            })),
            directus.request(readItems('gradePresale', {
                aggregate: {
                    avg: 'grade'
                },
                groupBy: ['presale', 'dateGrade'],
                filter: {
                    dateGrade: {
                        _nnull: true
                    }
                }
            })),
            directus.request(readItems('closedGrades', {
                fields: ['monthDate'],
            }))
        ]);

        return [presaleUsers, gradesData, allGradesWithUsers, averageGrades, closedMonths];
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const fetchCard = async (ID) => {
    try {
        const fields = [
            '*',
            {
                user_created: ['id', 'first_name', 'last_name']
            },
            {
                user_updated: ['id', 'first_name', 'last_name']
            },
            {
                initiator: ['id', 'first_name', 'last_name', 'Head', 'RefKey_1C']
            },
            {
                Department: ['*']
            },
            {
                Files: ['*']
            },
        ]
        const [data, limitation] = await Promise.all([
            directus.request(readItem('Project_Card', ID ,{fields: fields})),
            directus.request(readItems('JobLimitation', { fields: ['name'] }))
        ]);

        return [data, limitation];
    } catch (error) {
        console.error(error);
        throw error; 
    }
};

export const fetchTemplate = async () => {
    try {
        const data = await directus.request(
            readItems('JobTemplate', {
                fields: ['*'],
            })
        );
        return data;
    } catch (error) {
        console.error(error);
        throw error; 
    }
};

export const fetchCustomer = async (initiator) => {
    try {
        const data = await directus.request(
            readItems('Customers', {
                fields: ['*'],
                filter: {
                    manager: {
                        _icontains: initiator.split(" ")[0]
                    }
                }
            })
        );
        return data;
    } catch (error) {
        console.error(error);
        throw error; 
    }
};

export const fetchCustomerContact = async (CRMID) => {
    try {
        const data = await directus.request(
            readItems('Customer_Contact', {
                fields: ['*'],
                filter: {
                    customerCRMID: {
                        _icontains: CRMID
                    }
                }
            })
        );
        return data;
    } catch (error) {
        console.error(error);
        throw error; 
    }
};

export const GetfilesInfo = async (files) => {
    if (!files.length) {
        return [];
    }
    const fileInfoPromises = files.map(async (file) => {
        const result = await directus.request(
            readFile(file.directus_files_id, {
                fields: ['id', 'filename_download'],
            })
        );
        return result;
    });

    const fileInfo = await Promise.all(fileInfoPromises);
    return fileInfo;
};

export const fetchUser = async () => {
    try {
        const data = await directus.request(
            readUsers({
                fields: [
                    '*'
                ],
            })
        );
        return data;
    } catch (error) {
        console.error(error);
        throw error; 
    }
};

const isEqual = (value1, value2) => { // глубокое сравнение объектов
    if (value1 === value2) return true; 
    if (typeof value1 !== 'object' || typeof value2 !== 'object' || value1 == null || value2 == null) {
        return false; 
    }

    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);

    if (keys1.length !== keys2.length) return false; 

    for (let key of keys1) {
        if (!keys2.includes(key) || !isEqual(value1[key], value2[key])) {
            return false; 
        }
    }

    return true;
};

export const UpdateData = async (data) => {
    try {
        const item = await directus.request(readItem('Project_Card', data.id));
        const id = data.id;
        const savedata = {
            ...data,
            initiator: data.initiator.id || data.initiator,
            Department: data.Department.id || data.Department
        };

        // Преобразование числовых полей
        const numericFields = ['HotelCost', 'dailyCost', 'otherPayments', 'tiketsCost','HiredCost'];
        numericFields.forEach(field => {
            if (field in savedata) {
                const value = savedata[field];
                if (typeof value === 'string') {
                    const cleanValue = value.replace(/\s/g, '').replace(',', '.');
                    savedata[field] = parseFloat(cleanValue) || 0;
                } else if (value === null || value === undefined) {
                    savedata[field] = 0;
                }
            }
        });

        ['id', 'user_created', 'date_created', 'user_updated', 'date_updated', 'sort'].forEach(key => delete savedata[key]);
        
        Object.keys(savedata).forEach(key => {
            if (isEqual(savedata[key], item[key])) {
                delete savedata[key];
            }
        });

        if ('dateStart' in savedata && !savedata.dateStart) {
            savedata.dateStart = null; // обнуляем, если дата пустая
        }
        if ('deadline' in savedata && !savedata.deadline) {
            savedata.deadline = null; // обнуляем, если дата пустая
        }
        console.log(savedata);
        if (Object.keys(savedata).length > 0) {
            const req = await directus.request(updateItem('Project_Card', id, savedata));
            return req;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error updating data:", error);
        throw error;
    }
};

export const Update1CField = async(refKey) => {
    try {
        const req = await directus.request(updateMe({
            RefKey_1C: refKey,
        }));
        return req;
    } catch (error) {
        console.error("Error updating user 1C_RefKey:", error);
        return null;
    }
};


export const CreateItemDirectus = async (data, token) => {
    const makeRequest = async () => {
        const savedata = {
            ...data,
            initiator: data.initiator.id || '',
            Department: data.Department.id || 0
        };
        ['id', 'user_created', 'date_created', 'date_updated', 'user_updated', 'sort'].forEach(key => delete savedata[key]);
        const req = await directus.request(createItem('Project_Card', savedata));
        return req;
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        console.error("Error creating data:", error);
        throw error;
    }
};


export const logout = async () => {
    const result = await directus.logout();
    return result;
};

export const uploadFilesDirectus = async (files) => {
    try {
        console.log(files);
        const uploadPromises = files.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await directus.request(uploadFiles(formData));
            return response
        });
        const responses = await Promise.all(uploadPromises);
        return responses;
    } catch (error) {
        console.error('Ошибка при загрузке файлов:', error);
        throw error;
    }
};

export const GetFilesStartId = async () => {
    const existingFiles = await directus.request(
        readItems('Project_Card_files', {
            sort: ['-id'],
            limit: 1
        })
    );
    console.log(existingFiles);
    
    return existingFiles.length > 0 ? existingFiles[0].id + 1 : 1;
}

export const deleteFileDirectus = async (fileId) => {
    try {
        console.log(fileId);
        await directus.request(deleteFile(fileId));
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        throw error;
    }
};

// export const fetchGrades = async (userId) => {
//     try {
//         const grades = await directus.request(readItems('gradePresale', {
//             fields: ['*', { presale: ['*', { user: ['id', 'first_name'] }] }],
//             filter: {
//                 user_created: {
//                     _eq: userId
//                 }
//             }
//         }));
//         return grades;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// };

export const updateOrCreateGrade = async (presaleId, grade, dateGrade) => {
    try {
        // Проверяем, существует ли уже оценка за этот месяц от текущего пользователя
        const existingGrade = await directus.request(readItems('gradePresale', {
            filter: {
                _and: [
                    { presale: { _eq: presaleId } },
                    { dateGrade: { _eq: dateGrade } },
                    { user_created: { _eq: '$CURRENT_USER' } }
                ]
            },
            limit: 1
        }));

        if (existingGrade.length > 0) {
            // Обновляем существующую оценку
            return await directus.request(updateItem('gradePresale', existingGrade[0].id, {
                grade: grade
            }));
        } else {
            // Создаем новую оценку
            return await directus.request(createItem('gradePresale', {
                grade: grade,
                presale: presaleId,
                dateGrade: dateGrade
            }));
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const closeMonthGrades = async (month) => {
    try {
        return await directus.request(createItem('closedGrades', {
            monthDate: month
        }));
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const openMonthGrades = async (month) => {
    try {
        // Находим и удаляем запись о закрытом месяце
        const closedMonth = await directus.request(readItems('closedGrades', {
            filter: {
                monthDate: {
                    _eq: month
                }
            },
            limit: 1
        }));
        
        if (closedMonth.length > 0) {
            await directus.request(deleteItem('closedGrades', closedMonth[0].id));
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const fetchAITemplates = async (departmentId) => {
    try {
        const templates = await directus.request(
            readItems('TemplateFromAI', {
                fields: ['JobDescription'],
                filter: {
                    Department: {
                        _eq: departmentId
                    }
                }
            })
        );
        return templates;
    } catch (error) {
        console.error('Ошибка при получении AI шаблонов:', error);
        throw error;
    }
};

export const fetchListsKIIMatchingCodes = async (codes = []) => {
    if (!codes.length) {
        return [];
    }
    
    // Расширяем список кодов: добавляем варианты с пробелами и без пробелов
    const expandedCodes = new Set();
    codes.forEach(code => {
        const normalized = String(code).trim();
        if (normalized) {
            // Добавляем код без пробела
            expandedCodes.add(normalized);
            // Добавляем код с пробелом в конце
            expandedCodes.add(normalized + ' ');
        }
    });
    
    const codesArray = Array.from(expandedCodes);
    
    try {
        const lists = await directus.request(
            readItems('ListsKII', {
                fields: [
                    '*.*',
                ],
                limit: -1,
                filter: {
                    okved: {
                        _some: {
                            ListsKIIokved_code: {
                                _in: codesArray
                            }
                        }
                    }
                }
            })
        );

        const normalizeActivity = (value) => {
            if (!value || typeof value !== 'string') {
                return 'Без указания сферы';
            }
            const trimmed = value.trim();
            return trimmed.length ? trimmed : 'Без указания сферы';
        };

        const groupedMap = lists.reduce((acc, item) => {
            const groupKey = normalizeActivity(item?.activity);
            if (!acc.has(groupKey)) {
                acc.set(groupKey, []);
            }
            acc.get(groupKey).push(item);
            return acc;
        }, new Map());

        const groupedLists = Array.from(groupedMap.entries()).map(([activity, items]) => ({
            activity,
            items: [...items].sort((a, b) => {
                // Сортировка элементов внутри группы по номерам
                const numberA = a?.number || '';
                const numberB = b?.number || '';
                return compareVersionNumbers(numberA, numberB);
            })
        })).sort((a, b) => {
            // Сортировка групп по номерам
            const groupNumA = extractGroupNumber(a.activity);
            const groupNumB = extractGroupNumber(b.activity);
            return groupNumA - groupNumB;
        });

        return groupedLists;
    } catch (error) {
        console.error('Ошибка при получении ListsKII:', error);
        throw error;
    }
};

export const fetchListsKIIByCode = async (code) => {
    if (!code) {
        return [];
    }

    try {
        const lists = await directus.request(
            readItems('ListsKII', {
                fields: [
                    '*.*',
                ],
                limit: -1,
                filter: {
                    okved: {
                        _some: {
                            ListsKIIokved_code: {
                                _contains: String(code).trim()
                            }
                        }
                    }
                }
            })
        );

        const normalizeActivity = (value) => {
            if (!value || typeof value !== 'string') {
                return '10. Область оборонной промышленности';
            }
            const trimmed = value.trim();
            return trimmed.length ? trimmed : '10. Область оборонной промышленности';
        };

        const groupedMap = lists.reduce((acc, item) => {
            const groupKey = normalizeActivity(item?.activity);
            if (!acc.has(groupKey)) {
                acc.set(groupKey, []);
            }
            acc.get(groupKey).push(item);
            return acc;
        }, new Map());

        const groupedLists = Array.from(groupedMap.entries()).map(([activity, items]) => ({
            activity,
            items: [...items].sort((a, b) => {
                // Сортировка элементов внутри группы по номерам
                const numberA = a?.number || '';
                const numberB = b?.number || '';
                return compareVersionNumbers(numberA, numberB);
            })
        })).sort((a, b) => {
            // Сортировка групп по номерам
            const groupNumA = extractGroupNumber(a.activity);
            const groupNumB = extractGroupNumber(b.activity);
            return groupNumA - groupNumB;
        });

        return groupedLists;
    } catch (error) {
        console.error('Ошибка при получении данных ListsKII по коду:', error);
        throw error;
    }
};

export const fetchOfDataByInn = async (inn) => {
    try {
        const records = await directus.request(
            readItems('ofdata', {
                fields: ['*'],
                filter: {
                    INN: {
                        _eq: inn
                    }
                },
                limit: 1
            })
        );
        if (!records.length) {
            return null;
        }

        const record = records[0];
        let parsedObject = record.object;

        if (typeof parsedObject === 'string') {
            try {
                parsedObject = JSON.parse(parsedObject);
            } catch (parseError) {
                console.warn('Не удалось распарсить поле object из ofdata:', parseError);
            }
        }

        return {
            ...record,
            object: parsedObject
        };
    } catch (error) {
        console.error('Ошибка при получении записи ofdata:', error);
        throw error;
    }
};

export const saveOfDataRecord = async (inn, object) => {
    try {
        if (!object || (typeof object === 'object' && !Array.isArray(object) && Object.keys(object).length === 0)) {
            console.warn('Пустой объект ofdata не будет сохранён в Directus');
            return null;
        }
        return await directus.request(
            createItem('ofdata', {
                INN: inn,
                object
            })
        );
    } catch (error) {
        console.error('Ошибка при сохранении записи ofdata:', error);
        throw error;
    }
};

// Функции для работы с AI чатами

export const fetchUserChats = async () => {
    try {
        const chats = await directus.request(readItems('AI_Chats', {
            fields: ['*'],
            filter: {
                user_created: {
                    _eq: '$CURRENT_USER'
                }
            },
            sort: ['-date_created']
        }));
        return chats;
    } catch (error) {
        console.error('Ошибка при получении чатов:', error);
        throw error;
    }
};

export const createNewChat = async (title) => {
    try {
        const chat = await directus.request(createItem('AI_Chats', {
            title: title || 'Новый чат'
        }));
        return chat;
    } catch (error) {
        console.error('Ошибка при создании чата:', error);
        throw error;
    }
};

export const fetchChatMessages = async (chatId) => {
    try {
        const messages = await directus.request(readItems('AI_Messages', {
            fields: ['*'],
            filter: {
                chat_id: {
                    _eq: chatId
                }
            },
            sort: ['date_created']
        }));
        return messages;
    } catch (error) {
        console.error('Ошибка при получении сообщений:', error);
        throw error;
    }
};

export const saveMessage = async (chatId, content, role, reasoning = null) => {
    try {
        const message = await directus.request(createItem('AI_Messages', {
            chat_id: chatId,
            content,
            role,
            reasoning
        }));
        return message;
    } catch (error) {
        console.error('Ошибка при сохранении сообщения:', error);
        throw error;
    }
};

export const updateChatTitle = async (chatId, title) => {
    try {
        await directus.request(updateItem('AI_Chats', chatId, {
            title
        }));
    } catch (error) {
        console.error('Ошибка при обновлении названия чата:', error);
        throw error;
    }
};

export const deleteChat = async (chatId) => {
    try {
        await directus.request(deleteItem('AI_Chats', chatId));
    } catch (error) {
        console.error('Ошибка при удалении чата:', error);
        throw error;
    }
};

// Функция для получения пользовательских настроек промптов
export const fetchUserPromptSettings = async () => {
    try {
        const settings = await directus.request(readItems('AI_User_Settings', {
            fields: ['*'],
            filter: {
                user_created: {
                    _eq: '$CURRENT_USER'
                }
            },
            limit: 1
        }));
        
        return settings.length > 0 ? settings[0] : null;
    } catch (error) {
        console.error('Ошибка при получении пользовательских настроек:', error);
        return null;
    }
};

// Функция для сохранения пользовательских настроек
export const saveUserPromptSettings = async (systemPrompt, userWrapper) => {
    try {
        const currentSettings = await fetchUserPromptSettings();
        
        if (currentSettings) {
            await directus.request(updateItem('AI_User_Settings', currentSettings.id, {
                system_prompt: systemPrompt,
                user_wrapper: userWrapper
            }));
        } else {
            await directus.request(createItem('AI_User_Settings', {
                system_prompt: systemPrompt,
                user_wrapper: userWrapper
            }));
        }
    } catch (error) {
        console.error('Ошибка при сохранении пользовательских настроек:', error);
        throw error;
    }
};

// Обновляем функции получения промптов
export const fetchSystemPrompt = async (modelId) => {
    try {
        // Сначала проверяем пользовательские настройки
        const userSettings = await fetchUserPromptSettings();
        if (userSettings?.system_prompt) {
            return userSettings.system_prompt;
        }

        // Если пользовательских настроек нет, берем значение по умолчанию
        const prompts = await directus.request(readItems('AI_System_Prompts', {
            fields: ['*'],
            limit: 1
        }));
        
        return prompts.length > 0 ? prompts[0].prompt : null;
    } catch (error) {
        console.error('Ошибка при получении системного промпта:', error);
        return null;
    }
};

export const fetchUserPromptWrapper = async (modelId) => {
    try {
        // Сначала проверяем пользовательские настройки
        const userSettings = await fetchUserPromptSettings();
        if (userSettings?.user_wrapper) {
            return userSettings.user_wrapper;
        }

        // Если пользовательских настроек нет, берем значение по умолчанию
        const wrappers = await directus.request(readItems('AI_User_Prompt_Wrappers', {
            fields: ['*'],
            limit: 1
        }));
        
        return wrappers.length > 0 ? wrappers[0].wrapper : null;
    } catch (error) {
        console.error('Ошибка при получении обертки промпта:', error);
        return null;
    }
};

export const updateSystemPrompt = async (prompt) => {
    try {
        const prompts = await directus.request(readItems('AI_System_Prompts', {
            limit: 1
        }));

        if (prompts.length > 0) {
            await directus.request(updateItem('AI_System_Prompts', prompts[0].id, {
                prompt
            }));
        } else {
            await directus.request(createItem('AI_System_Prompts', {
                prompt
            }));
        }
    } catch (error) {
        console.error('Ошибка при обновлении системного промпта:', error);
        throw error;
    }
};

export const updateUserPromptWrapper = async (wrapper) => {
    try {
        const wrappers = await directus.request(readItems('AI_User_Prompt_Wrappers', {
            limit: 1
        }));

        if (wrappers.length > 0) {
            await directus.request(updateItem('AI_User_Prompt_Wrappers', wrappers[0].id, {
                wrapper
            }));
        } else {
            await directus.request(createItem('AI_User_Prompt_Wrappers', {
                wrapper
            }));
        }
    } catch (error) {
        console.error('Ошибка при обновлении обертки промпта:', error);
        throw error;
    }
};

export default directus;
