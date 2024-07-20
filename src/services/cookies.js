import Cookies from 'js-cookie';

export const getSessionToken = () => {
  return Cookies.get('directus_session_token');
};

export const setSessionToken = (token) => {
  Cookies.set('directus_session_token', token);
};

export const clearSessionToken = () => {
  Cookies.remove('directus_session_token');
};

export default getSessionToken;