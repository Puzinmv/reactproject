import { createDirectus, authentication, graphql, rest, withToken, readItems, refresh, readUsers, updateItem, readMe } from "@directus/sdk";

export const directus = createDirectus(process.env.REACT_APP_API_URL)
    .with(authentication('cookie', { credentials: 'include', autoRefresh: true }))
//    .with(graphql({ credentials: 'include' }))
    .with(rest({ credentials: 'include' }))
    ;

export const login = async (email, password) => {
    const user = await directus.login(email, password);
    const token = await directus.getToken()
    console.log(user);
    return token;
};

export const GetCurrentUser = async () => {
    const CurrentUser = await directus.request(readMe({
		        fields: ['*'],
	        })  )
    return CurrentUser;
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

export const fetchData = async (token, collection) => {
    const data = await directus.request(
        withToken(token, readItems(collection, {
            fields: [
                '*',
                {
                    user_created: ['id','first_name','last_name']
                },
                {
                    initiator: ['id', 'first_name', 'last_name']
                },
                {
                    Files: ['*']
                },
            ],
        })));
    return data;
};

export const fetchTemplate = () => {
    const data = [
        { JobName: 'выуваывавы', ResourceDay: 3, FrameDay: 3 },
        { JobName: 'Шаблон 2', ResourceDay: 2, FrameDay: 3 },
        { JobName: 'Шаблон 3', ResourceDay: 5, FrameDay: 3 },
        { JobName: 'Шаблон 4', ResourceDay: 4, FrameDay: 3 },
        { JobName: 'Шаблон 5', ResourceDay: 6, FrameDay: 3 },

    ];
    return data;
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

export const UpdateData = async (data, token, collection) => {
    const id = data.id;
    data.initiator = data.initiator.id;
    ['id', 'user_created', 'date_created', 'date_updated', 'user_updated', 'sort'].forEach(key => delete data[key]);

    const req = await directus.request(withToken(token, updateItem(collection, id, data)));
    console.log("update", data)
    return req;
};

export const logout = async () => {
    const result = await directus.logout();
};

export default directus;