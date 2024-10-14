import {
    createDirectus, authentication,  rest,
    readItems, readUsers, updateItem, readMe, readFile, readItem,
    uploadFiles, deleteFile, createItem, updateMe
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
            //const result = await response.json();
            const token = await getToken()
            //console.log(result.data.access_token, token)
            //directus.setToken(result.data.access_token); 
            return token;
        } else {
            return null;
        }

    } catch (e) {
        console.error(e)
    }

};


export const getToken = async () => {
    try {
        const token = await fetch(process.env.REACT_APP_API_URL+'/auth/refresh', {
            method: 'POST',
            credentials: 'include', // this is required in order to send the refresh/session token cookie
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'session' }) // using 'session' mode, but can also be 'cookie' or 'json'
        })
            .then((response) => response.json())
            .then((data) => {
                console.log(data)
                return data
            })
        //const token = await directus.refresh();
        //console.log(token)
        return token;
    } catch (e) {
        console.error(e)
    }

};

export const getCurrentUser = async () => {
    try {
        const user = await directus.request(readMe());
        return user;
    } catch (e) {
        console.error(e)
    }

};

export const fetchData = async (token) => {
    const makeRequest = async (token) => {
        const data = await directus.request(readItems('Project_Card', {
                fields: [
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
                ],
            })
        );

        const departament = await directus.request(
             readItems('Department', { fields: ['*'] })
        );
        const limitationTemplate = await directus.request(
            readItems('JobLimitation', { fields: ['name'] })
        );
        const CurrentUser = await getCurrentUser();


        return [data, departament, limitationTemplate, CurrentUser];
    };

    try {
        return await makeRequest(token);
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
                        _contains: initiator.split(" ")[0]
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
                        _contains: CRMID
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
        ['id', 'user_created', 'date_created', 'user_updated', 'date_updated', 'sort', 'Files'].forEach(key => delete savedata[key]);
        
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

export const deleteFileDirectus = async (fileId) => {
    try {
        console.log(fileId);
        await directus.request(deleteFile(fileId));
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        throw error;
    }
};

export default directus;