import {
    createDirectus, authentication, graphql, rest, withToken,
    readItems, refresh, readUsers, updateItem, readMe, readFile,
    uploadFiles, deleteFile, createItem
} from "@directus/sdk";

export const directus = createDirectus(process.env.REACT_APP_API_URL)
    .with(authentication('cookie', { credentials: 'include', autoRefresh: true }))
    .with(graphql({ credentials: 'include' }))
    .with(rest({ credentials: 'include' }))
    ;

export const login = async (email, password) => {
    const user = await directus.login(email, password);
    return user.access_token;
};


export const refreshlogin = async () => {
    //const getCookie = (name) => {
    //    const value = `; ${document.cookie}`;
    //    const parts = value.split(`; ${name}=`);
    //    if (parts.length === 2) return parts.pop().split(';').shift();
    //};
    //const sessionToken = getCookie('directus_session_token');
    //if (sessionToken) return sessionToken;
    let token = null;
    try {
        const req = await directus.request(refresh('cookie'));
        token = req?.access_token || null; // Используем опциональную цепочку для безопасного доступа к свойству
    } catch (error) {
        token = null; // Если возникает ошибка, возвращаем null
    }
    return token;
};

export const fetchData = async (token) => {
    const data = await directus.request(
        withToken(token, readItems('Project_Card', {
            fields: [
                '*',
                {
                    user_created: ['id','first_name','last_name']
                },
                {
                    user_updated: ['id','first_name','last_name']
                },
                {
                    initiator: ['id', 'first_name', 'last_name']
                },
                {
                    Department: ['*']
                },
                {
                    Files: ['*']
                },
            ],
        })));
    const departament = await directus.request(
        withToken(token, readItems('Department', { fields: ['*']})));
    
    const CurrentUser = await directus.request(readMe({fields: ['*']})  )

    return [data, departament, CurrentUser];
};

export const fetchTemplate = async (token) => {
    const data = await directus.request(
        withToken(token, 
            readItems('JobTemplate', {
            fields: ['*'],
        })));

    return data;
};

export const fetchCustomer = async (token, initiator) => {
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

export const fetchCustomerContact = async (token, CRMID) => {
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
    const data = await directus.request(
        withToken(token, readUsers({
            fields: [
                '*'
            ],
        })));

    return data;
}; 

export const UpdateData = async (data, token) => {
    try {
        // Извлекаем id из data
        const id = data.id;

        // Подготавливаем данные для сохранения
        const savedata = {
            ...data,
            initiator: data.initiator.id || data.initiator,
            Department: data.Department.id || data.Department
        };

        ['id', 'user_created', 'date_created', 'date_updated', 'user_updated', 'sort'].forEach(key => delete savedata[key]);
        const req = await directus.request(withToken(token, updateItem('Project_Card', id, savedata)));
        console.log("update", savedata);
        return req;
    } catch (error) {
        console.error("Error updating data:", error);
        throw error;
    }
};

export const CreateItemDirectus = async (data, token) => {
    try {
        // Подготавливаем данные для сохранения
        const savedata = {
            ...data,
            initiator: data.initiator.id || '',
            Department: data.Department.id || 0
        };
        ['id', 'user_created', 'date_created', 'date_updated', 'user_updated', 'sort'].forEach(key => delete savedata[key]);
        const req = await directus.request(withToken(token, createItem('Project_Card', savedata)));
        return req;
    } catch (error) {
        console.error("Error create data:", error);
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

export const deleteFileDirectus = async (fileId) => {
    try {
        console.log(fileId)
        await directus.request(deleteFile(fileId));;
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        throw error;
    }
};

export default directus;