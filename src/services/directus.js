import {
    createDirectus, authentication,  rest, withToken,
    readItems, refresh, readUsers, updateItem, readMe, readFile,
    uploadFiles, deleteFile, createItem,
    //graphql,
} from "@directus/sdk";

export const directus = createDirectus(process.env.REACT_APP_API_URL)
    .with(authentication('cookie', { credentials: 'include', autoRefresh: true }))
    //.with(graphql({ credentials: 'include' }))
    .with(rest())
    ;

export const login = async (email, password) => {
    try {
        const user = await directus.login(email, password);
        localStorage.setItem('accessToken', user.access_token)
        console.log(user)
        return user.access_token;
    } catch (e) {
        console.error(e)
    }

};

export const refreshlogin = async () => {
    let token = null;
    try {
        const req = await directus.request(refresh('cookie'));
        console.log(req);
        token = req?.access_token || null; // Используем опциональную цепочку для безопасного доступа к свойству
        if (token) localStorage.setItem('accessToken', token)
    } catch (error) {
        token = null; // Если возникает ошибка, возвращаем null
    }
    return token;
};

export const fetchData = async (token) => {
    const makeRequest = async (token) => {
        const data = await directus.request(
            withToken(token, readItems('Project_Card', {
                fields: [
                    '*',
                    {
                        user_created: ['id', 'first_name', 'last_name']
                    },
                    {
                        user_updated: ['id', 'first_name', 'last_name']
                    },
                    {
                        initiator: ['id', 'first_name', 'last_name', 'Head']
                    },
                    {
                        Department: ['*']
                    },
                    {
                        Files: ['*']
                    },
                ],
            }))
        );

        const departament = await directus.request(
            withToken(token, readItems('Department', { fields: ['*'] }))
        );

        const CurrentUser = await directus.request(withToken(token, readMe({ fields: ['*'] })));

        return [data, departament, CurrentUser];
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const newToken = await refreshlogin();
            if (newToken) {
                return await makeRequest(newToken);
            }
        }
        localStorage.removeItem('accessToken'); 
        console.error(error);
        throw error;
    }
};

export const fetchTemplate = async (token) => {
    const makeRequest = async (token) => {
        const data = await directus.request(
            withToken(token,
                readItems('JobTemplate', {
                    fields: ['*'],
                }))
        );
        return data;
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const newToken = await refreshlogin();
            if (newToken) {
                return await makeRequest(newToken);
            }
        }
        console.error(error);
        //throw error; 
    }
};

export const fetchCustomer = async (token, initiator) => {
    const makeRequest = async (token) => {
        const data = await directus.request(
            withToken(token,
                readItems('Customers', {
                    fields: ['*'],
                    filter: {
                        manager: {
                            _contains: initiator
                        }
                    }
                })
            )
        );
        return data;
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const newToken = await refreshlogin();
            if (newToken) {
                return await makeRequest(newToken);
            }
        }
        throw error; // Проброс ошибки дальше для обработки на более высоком уровне
    }
};

export const fetchCustomerContact = async (token, CRMID) => {
    const makeRequest = async (token) => {
        const data = await directus.request(
            withToken(token,
                readItems('Customer_Contact', {
                    fields: ['*'],
                    filter: {
                        customerCRMID: {
                            _contains: CRMID
                        }
                    }
                })
            )
        );
        return data;
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const newToken = await refreshlogin();
            if (newToken) {
                return await makeRequest(newToken);
            }
        }
        //throw error;
    }
};

export const GetfilesInfo = async (files, token) => {
    if (!files.length) {
        return [];
    }
    const fileInfoPromises = files.map(async (file) => {
        const result = await directus.request(
            withToken(token, readFile(file.directus_files_id, {
                fields: ['id', 'filename_download'],
            }))
        );
        return result;
    });

    const fileInfo = await Promise.all(fileInfoPromises);
    return fileInfo;
};

export const fetchUser = async (token) => {
    const makeRequest = async (token) => {
        const data = await directus.request(
            withToken(token, readUsers({
                fields: [
                    '*'
                ],
            }))
        );
        return data;
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const newToken = await refreshlogin();
            if (newToken) {
                return await makeRequest(newToken);
            }
        }
        throw error; // Проброс ошибки дальше для обработки на более высоком уровне
    }
};

export const UpdateData = async (data, token) => {
    const makeRequest = async (token) => {
        const id = data.id;
        const savedata = {
            ...data,
            initiator: data.initiator.id || data.initiator,
            Department: data.Department.id || data.Department
        };

        ['id', 'user_created', 'date_created', 'date_updated', 'user_updated', 'sort'].forEach(key => delete savedata[key]);
        const req = await directus.request(withToken(token, updateItem('Project_Card', id, savedata)));
        return req;
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const newToken = await refreshlogin();
            if (newToken) {
                return await makeRequest(newToken);
            }
        }
        console.error("Error updating data:", error);
        throw error;
    }
};


export const CreateItemDirectus = async (data, token) => {
    const makeRequest = async (token) => {
        const savedata = {
            ...data,
            initiator: data.initiator.id || '',
            Department: data.Department.id || 0
        };
        ['id', 'user_created', 'date_created', 'date_updated', 'user_updated', 'sort'].forEach(key => delete savedata[key]);
        const req = await directus.request(withToken(token, createItem('Project_Card', savedata)));
        return req;
    };

    try {
        return await makeRequest(token);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            const newToken = await refreshlogin();
            if (newToken) {
                return await makeRequest(newToken);
            }
        }
        console.error("Error creating data:", error);
        throw error;
    }
};


export const logout = async () => {
    const result = await directus.logout();
    return result;
};

export const uploadFilesDirectus = async (files, token) => {
    try {
        const uploadPromises = files.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await directus.request(withToken(token, uploadFiles(formData)));
            return response
        });
        const responses = await Promise.all(uploadPromises);
        return responses;
    } catch (error) {
        console.error('Ошибка при загрузке файлов:', error);
        throw error;
    }
};

export const deleteFileDirectus = async (fileId, token) => {
    try {
        await directus.request(withToken(token, deleteFile(fileId)));
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        throw error;
    }
};

export default directus;