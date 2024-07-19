import { createDirectus, authentication, graphql, rest, withToken, readItems } from "@directus/sdk";

export const directus = createDirectus('http://10.0.0.226:8055')
    .with(authentication('cookie', { credentials: 'include' }))
//    .with(graphql({ credentials: 'include' }))
    .with(rest({ credentials: 'include' }))
    ;

export const login = async (email, password) => {
    const user = await directus.login(email, password);
    const token = await directus.getToken()
    return token;
};

export const fetchData = async (token, collection) => {
    const data = await directus.request(
        withToken(token, readItems(collection)));
    console.log(data)
    return data;
};

export const logout = async () => {
    const result = await directus.logout();
};

export default directus;