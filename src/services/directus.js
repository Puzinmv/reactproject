import {
    createDirectus, authentication,  rest,
    readItems, readUsers, updateItem, readMe, readFile, readItem,
    uploadFiles, deleteFile, createItem, updateMe, deleteItem
} from "@directus/sdk";

export const directus = createDirectus(process.env.REACT_APP_API_URL)
    .with(authentication('session', { credentials: 'include', autoRefresh: true }))
    .with(rest({ credentials: 'include' }))
    ;

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

export const getCurrentUser = async () => {
    try {
        const user = await directus.request(readMe());
        if (!user) {
            throw new Error('Failed to get user data');
        }
        return user;
    } catch (e) {
        console.error(e);
        throw e;
    }
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
                                first_name: { _icontains: value }
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
                    {
                        initiator: {
                            first_name: { _icontains: currentUser.first_name }
                        }
                    },
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
        fields: ['id', 'first_name'],
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
                },
                sort: ['-date_created']
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