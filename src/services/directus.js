import {
    createDirectus, authentication,  rest, withToken,
    readItems, readUsers, updateItem, readMe, readFile,
    uploadFiles, deleteFile, createItem
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
        console.log('sdsdd')
        const response = await fetch(process.env.REACT_APP_API_URL +'/auth/login/ldap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                identifier: login,
                password: password,
                mode: "cookie"
            })
        });
        if (response.ok) {
            const result = await response.json();
            console.log(result.data.access_token)
            directus.setToken(result.data.access_token); 
            return response;
        } else {
            return null;
        }

    } catch (e) {
        console.error(e)
    }

};


export const getToken = async () => {
    try {
        const token = await directus.refresh();
        console.log(token)
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
                        initiator: ['id', 'first_name', 'last_name', 'Head']
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

export const UpdateData = async (data) => {
    try {
        const id = data.id;
        const savedata = {
            ...data,
            initiator: data.initiator.id || data.initiator,
            Department: data.Department.id || data.Department
        };
        ['id', 'user_created', 'date_created', 'date_updated', 'user_updated', 'sort'].forEach(key => delete savedata[key]);
        const req = await directus.request(updateItem('Project_Card', id, savedata));
        return req;
    } catch (error) {
        console.error("Error updating data:", error);
        throw error;
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
        await directus.request(withToken(deleteFile(fileId)));
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        throw error;
    }
};

export default directus;