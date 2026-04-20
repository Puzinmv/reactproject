import {
    createDirectus, authentication,  rest,
    customEndpoint, readItems, readUsers, updateItem, readMe, readFile, readItem,
    uploadFiles, deleteFile, createItem, updateMe, deleteItem, updateUser
} from "@directus/sdk";

const directusBaseUrl = new URL(process.env.REACT_APP_API_URL || '', window.location.origin).toString();

export const directus = createDirectus(directusBaseUrl)
    .with(authentication('session', { credentials: 'include', autoRefresh: true }))
    .with(rest({ credentials: 'include' }))
    ;

const normalizeDirectusCallOptions = (input) => {
    if (input === true) {
        return { skipSessionExpiredRedirect: true };
    }

    if (input && typeof input === 'object' && 'skipSessionExpiredRedirect' in input) {
        return { skipSessionExpiredRedirect: Boolean(input.skipSessionExpiredRedirect) };
    }

    return { skipSessionExpiredRedirect: false };
};

const isDirectusSessionUnauthorizedError = (error) => {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const status = error.response?.status
        ?? error.status
        ?? error?.extensions?.response?.status;

    if (status === 401) {
        return true;
    }

    const collectFromErrorsArray = (errors) => {
        if (!Array.isArray(errors)) {
            return false;
        }

        return errors.some((entry) => {
            const entryStatus = entry?.extensions?.response?.status;
            if (entryStatus === 401) {
                return true;
            }

            const code = String(entry?.extensions?.code || '').toUpperCase();
            return code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN';
        });
    };

    if (collectFromErrorsArray(error.errors)) {
        return true;
    }

    const code = String(error?.extensions?.code || error?.code || '').toUpperCase();
    if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
        return true;
    }

    return false;
};

let directusAuthRedirectScheduled = false;

const redirectToLoginPage = () => {
    if (typeof window === 'undefined' || directusAuthRedirectScheduled) {
        return;
    }

    const pathname = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
    // Уже на странице входа (корень SPA): при отсутствии сессии readMe даёт 401 —
    // assign('/') вызывал бесконечную перезагрузку localhost:3000/.
    if (pathname === '/') {
        return;
    }

    directusAuthRedirectScheduled = true;

    try {
        if (typeof directus.setToken === 'function') {
            directus.setToken(null);
        }
    } catch (clearTokenError) {
        // Ignore token cleanup failures.
    }

    window.location.assign('/');
};

const requestDirectus = async (operation, options = {}) => {
    const { skipSessionExpiredRedirect = false } = options;

    try {
        return await directus.request(operation);
    } catch (error) {
        if (!skipSessionExpiredRedirect && isDirectusSessionUnauthorizedError(error)) {
            redirectToLoginPage();
        }

        throw error;
    }
};

const getDefaultTrueConfBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return '/trueconf';
    }

    return 'https://trueconf.asterit.ru';
};

const TRUECONF_BASE_URL = String(process.env.REACT_APP_TRUECONF_BASE_URL || getDefaultTrueConfBaseUrl())
    .trim()
    .replace(/\/+$/, '');
const TRUECONF_PROD_OAUTH_TOKEN_URL = '/api/trueconf/oauth/token';
const TRUECONF_PROD_API_BASE_URL = '/api/trueconf/api/v3.11';
const TRUECONF_CLIENT_ID = process.env.REACT_APP_TRUECONF_CLIENT_ID || 'trueconf_server_users';
const TRUECONF_TOKEN_STORAGE_KEY = 'asterit.trueconf.tokens.v1';
const TRUECONF_ACCESS_TOKEN_SKEW_MS = 60 * 1000;

let trueConfRefreshPromise = null;
let trueConfLocalProxyMetaPromise = null;
let hasLoggedTrueConfLocalProxyDisabled = false;

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const buildTrueConfUrl = (path) => {
    const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;

    if (isAbsoluteUrl(TRUECONF_BASE_URL)) {
        return `${TRUECONF_BASE_URL}${normalizedPath}`;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return `${origin}${TRUECONF_BASE_URL}${normalizedPath}`;
};

const isLocalhostHost = () => (
    typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
);

const getTrueConfOauthTokenUrl = () => (
    isLocalhostHost()
        ? buildTrueConfUrl('/oauth2/v1/token')
        : TRUECONF_PROD_OAUTH_TOKEN_URL
);

const getTrueConfApiBaseUrl = () => (
    isLocalhostHost()
        ? buildTrueConfUrl('/api/v3.11')
        : TRUECONF_PROD_API_BASE_URL
);

const buildTrueConfApiUrl = (path) => {
    const baseUrl = String(getTrueConfApiBaseUrl() || '').replace(/\/+$/, '');
    const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;

    if (isAbsoluteUrl(baseUrl)) {
        return `${baseUrl}${normalizedPath}`;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return `${origin}${baseUrl}${normalizedPath}`;
};

const toFormUrlEncoded = (payload = {}) => {
    const params = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            return;
        }

        const normalized = String(value).trim();
        if (!normalized) {
            return;
        }

        params.set(key, normalized);
    });

    return params.toString();
};

const isLocalTrueConfProxy = () => (
    typeof window !== 'undefined'
    && window.location.hostname === 'localhost'
    && !isAbsoluteUrl(TRUECONF_BASE_URL)
);

const readTrueConfLocalProxyMeta = async () => {
    if (!isLocalTrueConfProxy()) {
        return { enabled: true, proxyCookieConfigured: true };
    }

    if (!trueConfLocalProxyMetaPromise) {
        trueConfLocalProxyMetaPromise = fetch('/trueconf-proxy/meta', {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
            },
        })
            .then(async (response) => {
                if (!response.ok) {
                    return { enabled: false, proxyCookieConfigured: false };
                }

                try {
                    const meta = await response.json();
                    return {
                        enabled: Boolean(meta?.enabled),
                        proxyCookieConfigured: Boolean(meta?.proxyCookieConfigured),
                    };
                } catch (error) {
                    return { enabled: false, proxyCookieConfigured: false };
                }
            })
            .catch(() => ({ enabled: false, proxyCookieConfigured: false }));
    }

    return trueConfLocalProxyMetaPromise;
};

const canUseTrueConfApi = async () => {
    const proxyMeta = await readTrueConfLocalProxyMeta();
    const isEnabled = Boolean(proxyMeta?.enabled) && Boolean(proxyMeta?.proxyCookieConfigured);

    if (!isEnabled && isLocalTrueConfProxy() && !hasLoggedTrueConfLocalProxyDisabled) {
        hasLoggedTrueConfLocalProxyDisabled = true;
        console.warn('TrueConf: local proxy cookie is not configured, TrueConf API calls are disabled');
    }

    return isEnabled;
};

const getTrueConfStorage = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return window.localStorage;
    } catch (error) {
        return null;
    }
};

const sanitizeStoredTrueConfTokens = (rawValue) => {
    if (!rawValue || typeof rawValue !== 'object') {
        return null;
    }

    const accessToken = String(rawValue.access_token || '').trim();
    if (!accessToken) {
        return null;
    }

    const refreshToken = String(rawValue.refresh_token || '').trim();
    const tokenType = String(rawValue.token_type || '').trim();
    const scope = String(rawValue.scope || '').trim();
    const expiresIn = Number(rawValue.expires_in);
    const expiresAt = Number(rawValue.expires_at);

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: tokenType,
        scope,
        expires_in: Number.isFinite(expiresIn) ? expiresIn : null,
        expires_at: Number.isFinite(expiresAt) ? expiresAt : 0,
    };
};

const buildTrueConfTokenRecord = (tokenPayload, previousTokens = null) => {
    if (!tokenPayload || typeof tokenPayload !== 'object') {
        return null;
    }

    const accessToken = String(tokenPayload.access_token || '').trim();
    if (!accessToken) {
        return null;
    }

    const rawRefreshToken = String(tokenPayload.refresh_token || '').trim();
    const previousRefreshToken = String(previousTokens?.refresh_token || '').trim();
    const refreshToken = rawRefreshToken || previousRefreshToken;

    const tokenType = String(tokenPayload.token_type || '').trim();
    const scope = String(tokenPayload.scope || '').trim();
    const expiresIn = Number(tokenPayload.expires_in);
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0
        ? Date.now() + (expiresIn * 1000)
        : Date.now();

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: tokenType,
        scope,
        expires_in: Number.isFinite(expiresIn) ? expiresIn : null,
        expires_at: expiresAt,
    };
};

const readStoredTrueConfTokens = () => {
    const storage = getTrueConfStorage();
    if (!storage) {
        return null;
    }

    try {
        const serializedValue = storage.getItem(TRUECONF_TOKEN_STORAGE_KEY);
        if (!serializedValue) {
            return null;
        }

        const parsedValue = JSON.parse(serializedValue);
        return sanitizeStoredTrueConfTokens(parsedValue);
    } catch (error) {
        console.warn('TrueConf: failed to read token from storage', error);
        return null;
    }
};

const writeTrueConfTokens = (tokenRecord) => {
    const storage = getTrueConfStorage();
    if (!storage || !tokenRecord) {
        return;
    }

    try {
        storage.setItem(TRUECONF_TOKEN_STORAGE_KEY, JSON.stringify(tokenRecord));
    } catch (error) {
        console.warn('TrueConf: failed to save token to storage', error);
    }
};

export const clearTrueConfTokens = () => {
    const storage = getTrueConfStorage();
    if (!storage) {
        return;
    }

    try {
        storage.removeItem(TRUECONF_TOKEN_STORAGE_KEY);
    } catch (error) {
        console.warn('TrueConf: failed to clear token from storage', error);
    }
};

const normalizeTrueConfUsername = (rawValue) => {
    const text = String(rawValue || '').trim();
    if (!text) {
        return '';
    }

    const pathParts = text.split(/[/\\]/);
    const withoutPath = String(pathParts[pathParts.length - 1] || '').trim();

    if (!withoutPath) {
        return '';
    }

    if (withoutPath.includes('@')) {
        return String(withoutPath.split('@')[0] || '').trim();
    }

    return withoutPath;
};

const warmupTrueConfSession = async () => {
    try {
        await fetch(buildTrueConfUrl('/'), {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
        });
    } catch (error) {
        // Ignore warmup errors; the next token request will surface the real cause.
    }
};

const requestTrueConfToken = async (payload, { allowRetry = true } = {}) => {
    const response = await fetch(getTrueConfOauthTokenUrl(), {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'same-origin',
        body: toFormUrlEncoded(payload),
    });

    let responseBody = null;
    try {
        responseBody = await response.json();
    } catch (parseError) {
        responseBody = null;
    }

    if (response.status === 403 && allowRetry && isLocalhostHost()) {
        await warmupTrueConfSession();
        return requestTrueConfToken(payload, { allowRetry: false });
    }

    if (!response.ok) {
        const error = new Error('TrueConf token request failed');
        error.status = response.status;
        error.payload = responseBody;
        throw error;
    }

    return responseBody;
};

const isTrueConfAccessTokenValid = (tokens) => {
    if (!tokens?.access_token) {
        return false;
    }

    const expiresAt = Number(tokens.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
        return false;
    }

    return (expiresAt - TRUECONF_ACCESS_TOKEN_SKEW_MS) > Date.now();
};

export const loginTrueConf = async (username, password) => {
    if (!(await canUseTrueConfApi())) {
        clearTrueConfTokens();
        return null;
    }

    const normalizedUsername = normalizeTrueConfUsername(username);
    const normalizedPassword = String(password || '');

    if (!normalizedUsername || !normalizedPassword) {
        clearTrueConfTokens();
        return null;
    }

    const responsePayload = await requestTrueConfToken({
        grant_type: 'password',
        username: normalizedUsername,
        password: normalizedPassword,
        client_id: TRUECONF_CLIENT_ID,
    });

    const tokenRecord = buildTrueConfTokenRecord(responsePayload);
    if (!tokenRecord) {
        throw new Error('TrueConf token response does not contain access_token');
    }

    writeTrueConfTokens(tokenRecord);
    return tokenRecord;
};

const refreshTrueConfTokens = async () => {
    const currentTokens = readStoredTrueConfTokens();
    const refreshToken = String(currentTokens?.refresh_token || '').trim();
    if (!refreshToken) {
        return null;
    }

    const responsePayload = await requestTrueConfToken({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: TRUECONF_CLIENT_ID,
    });

    const refreshedTokens = buildTrueConfTokenRecord(responsePayload, currentTokens);
    if (!refreshedTokens) {
        throw new Error('TrueConf refresh response does not contain access_token');
    }

    writeTrueConfTokens(refreshedTokens);
    return refreshedTokens;
};

export const getTrueConfAccessToken = async ({ forceRefresh = false } = {}) => {
    if (!(await canUseTrueConfApi())) {
        return null;
    }

    const storedTokens = readStoredTrueConfTokens();

    if (!forceRefresh && isTrueConfAccessTokenValid(storedTokens)) {
        return storedTokens.access_token;
    }

    if (!storedTokens?.refresh_token) {
        return null;
    }

    if (!trueConfRefreshPromise) {
        trueConfRefreshPromise = refreshTrueConfTokens()
            .catch((error) => {
                clearTrueConfTokens();
                throw error;
            })
            .finally(() => {
                trueConfRefreshPromise = null;
            });
    }

    try {
        const refreshedTokens = await trueConfRefreshPromise;
        return refreshedTokens?.access_token || null;
    } catch (error) {
        console.warn('TrueConf: failed to refresh token', error);
        return null;
    }
};

const normalizeTrueConfIdentifier = (value) => String(value ?? '').trim();

const TRUECONF_PRESENCE_STATUS_FIELDS = Object.freeze([
    'status',
    'peerStatus',
    'userStatus',
    'presenceStatus',
    'state',
]);
const TRUECONF_PRESENCE_EXT_STATUS_FIELDS = Object.freeze([
    'extStatus',
    'ext_status',
    'extendedStatus',
    'presenceExtStatus',
    'userExtStatus',
]);

const toFiniteTrueConfStatus = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const readTrueConfPresenceField = (source, fieldNames = []) => {
    if (!source || typeof source !== 'object') {
        return null;
    }

    for (const fieldName of fieldNames) {
        if (!Object.prototype.hasOwnProperty.call(source, fieldName)) {
            continue;
        }

        const numericValue = toFiniteTrueConfStatus(source[fieldName]);
        if (numericValue !== null) {
            return numericValue;
        }
    }

    return null;
};

const extractTrueConfPresence = (payload) => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const presenceCandidates = [
        payload,
        payload?.contact,
        payload?.user,
        payload?.presence,
        payload?.statusInfo,
        payload?.status_info,
        payload?.contact?.user,
        payload?.contact?.presence,
        payload?.user?.presence,
    ].filter((value) => Boolean(value) && typeof value === 'object');

    let status = null;
    let extStatus = null;

    for (const presenceCandidate of presenceCandidates) {
        if (status === null) {
            status = readTrueConfPresenceField(presenceCandidate, TRUECONF_PRESENCE_STATUS_FIELDS);
        }

        if (extStatus === null) {
            extStatus = readTrueConfPresenceField(presenceCandidate, TRUECONF_PRESENCE_EXT_STATUS_FIELDS);
        }

        if (status !== null && extStatus !== null) {
            break;
        }
    }

    if (status === null && extStatus === null) {
        return null;
    }

    return { status, extStatus };
};

const withTrueConfPresence = ({
    contact = null,
    userId = '',
    contactId = '',
    source = 'api',
}) => ({
    contact,
    userId,
    contactId,
    presence: extractTrueConfPresence(contact),
    source,
});

const toUniqueTrueConfIdentifiers = (values = []) => {
    const result = [];
    const seen = new Set();

    values.forEach((value) => {
        const normalizedValue = normalizeTrueConfIdentifier(value);
        if (!normalizedValue || seen.has(normalizedValue)) {
            return;
        }

        seen.add(normalizedValue);
        result.push(normalizedValue);
    });

    return result;
};

const parseTrueConfResponseJson = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const findTrueConfSdkMethod = (candidates = []) => {
    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }

        const fn = candidate?.fn;
        if (typeof fn === 'function') {
            return { context: candidate.context || null, fn };
        }
    }

    return null;
};

const getTrueConfSdkInstance = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const sdkCandidates = [
        window.TrueConfSDK,
        window.trueConfSDK,
        window.trueconfSdk,
        window.TCSDK,
    ];

    return sdkCandidates.find((candidate) => Boolean(
        candidate
        && (typeof candidate === 'object' || typeof candidate === 'function'),
    )) || null;
};

const normalizeTrueConfSdkStatusEntry = (rawEntry, fallbackUserId = '') => {
    if (rawEntry === null || rawEntry === undefined) {
        return null;
    }

    if (typeof rawEntry !== 'object') {
        const status = toFiniteTrueConfStatus(rawEntry);
        if (status === null) {
            return null;
        }

        return {
            userId: normalizeTrueConfIdentifier(fallbackUserId),
            status,
            extStatus: null,
        };
    }

    const presence = extractTrueConfPresence(rawEntry);
    const resolvedUserId = normalizeTrueConfIdentifier(
        rawEntry?.userId
        || rawEntry?.userID
        || rawEntry?.id
        || rawEntry?.uid
        || rawEntry?.login
        || rawEntry?.user
        || fallbackUserId,
    );

    if (!presence && !resolvedUserId) {
        return null;
    }

    return {
        userId: resolvedUserId,
        status: presence?.status ?? null,
        extStatus: presence?.extStatus ?? null,
    };
};

const normalizeTrueConfSdkStatuses = (rawStatuses, contactIds = []) => {
    const normalizedStatuses = [];
    const normalizedContactIds = toUniqueTrueConfIdentifiers(contactIds);

    const pushStatus = (rawEntry, fallbackUserId = '') => {
        const normalizedEntry = normalizeTrueConfSdkStatusEntry(rawEntry, fallbackUserId);
        if (!normalizedEntry) {
            return;
        }

        if (normalizedEntry.status === null && normalizedEntry.extStatus === null) {
            return;
        }

        normalizedStatuses.push(normalizedEntry);
    };

    if (Array.isArray(rawStatuses)) {
        rawStatuses.forEach((statusEntry, index) => {
            pushStatus(statusEntry, normalizedContactIds[index] || '');
        });
    } else if (rawStatuses && typeof rawStatuses === 'object') {
        const nestedArray = (
            (Array.isArray(rawStatuses.statuses) && rawStatuses.statuses)
            || (Array.isArray(rawStatuses.usersStatuses) && rawStatuses.usersStatuses)
            || (Array.isArray(rawStatuses.users) && rawStatuses.users)
            || null
        );

        if (nestedArray) {
            nestedArray.forEach((statusEntry, index) => {
                pushStatus(statusEntry, normalizedContactIds[index] || '');
            });
        } else {
            let consumedAsMap = false;

            normalizedContactIds.forEach((contactId) => {
                if (!Object.prototype.hasOwnProperty.call(rawStatuses, contactId)) {
                    return;
                }

                consumedAsMap = true;
                pushStatus(rawStatuses[contactId], contactId);
            });

            if (!consumedAsMap) {
                pushStatus(rawStatuses, normalizedContactIds[0] || '');
            }
        }
    } else {
        pushStatus(rawStatuses, normalizedContactIds[0] || '');
    }

    return normalizedStatuses;
};

const requestTrueConfStatusesViaSdk = async ({ contactIds = [] } = {}) => {
    const normalizedContactIds = toUniqueTrueConfIdentifiers(contactIds);
    if (!normalizedContactIds.length) {
        return null;
    }

    const sdk = getTrueConfSdkInstance();
    if (!sdk) {
        return null;
    }

    const getUsersStatusesMethod = findTrueConfSdkMethod([
        { context: sdk, fn: sdk?.getUsersStatuses },
        { context: sdk?.users, fn: sdk?.users?.getUsersStatuses },
        { context: sdk?.Users, fn: sdk?.Users?.getUsersStatuses },
    ]);

    try {
        if (getUsersStatusesMethod) {
            const rawStatuses = await getUsersStatusesMethod.fn.call(
                getUsersStatusesMethod.context,
                normalizedContactIds,
            );

            const normalizedStatuses = normalizeTrueConfSdkStatuses(rawStatuses, normalizedContactIds);
            if (normalizedStatuses.length) {
                return normalizedStatuses;
            }
        }

        const getUserStatusMethod = findTrueConfSdkMethod([
            { context: sdk, fn: sdk?.getUserStatus },
            { context: sdk?.users, fn: sdk?.users?.getUserStatus },
            { context: sdk?.Users, fn: sdk?.Users?.getUserStatus },
        ]);

        if (!getUserStatusMethod) {
            return null;
        }

        const singleStatuses = [];
        for (const contactId of normalizedContactIds) {
            const rawStatus = await getUserStatusMethod.fn.call(getUserStatusMethod.context, contactId);
            const normalizedStatus = normalizeTrueConfSdkStatusEntry(rawStatus, contactId);
            if (normalizedStatus && (normalizedStatus.status !== null || normalizedStatus.extStatus !== null)) {
                singleStatuses.push(normalizedStatus);
            }
        }

        return singleStatuses.length ? singleStatuses : null;
    } catch (error) {
        console.warn('TrueConf SDK: failed to get users statuses', error);
        return null;
    }
};

const findTrueConfSdkStatusForContact = (statuses = [], contactIds = []) => {
    if (!Array.isArray(statuses) || !statuses.length) {
        return null;
    }

    const normalizedContactIds = toUniqueTrueConfIdentifiers(contactIds);
    const normalizedStatuses = statuses.map((statusEntry) => ({
        ...statusEntry,
        userIdLower: normalizeTrueConfIdentifier(statusEntry?.userId).toLocaleLowerCase('en-US'),
    }));

    for (const contactId of normalizedContactIds) {
        const normalizedContactId = contactId.toLocaleLowerCase('en-US');
        const matchedStatus = normalizedStatuses.find((statusEntry) => statusEntry.userIdLower === normalizedContactId);
        if (matchedStatus) {
            return {
                userId: matchedStatus.userId,
                status: matchedStatus.status,
                extStatus: matchedStatus.extStatus,
            };
        }
    }

    const firstStatus = normalizedStatuses[0];
    return {
        userId: firstStatus.userId,
        status: firstStatus.status,
        extStatus: firstStatus.extStatus,
    };
};

const requestTrueConfAddressBookContactViaSdk = async ({ contactIds = [] } = {}) => {
    const normalizedContactIds = toUniqueTrueConfIdentifiers(contactIds);
    if (!normalizedContactIds.length) {
        return null;
    }

    const sdkStatuses = await requestTrueConfStatusesViaSdk({ contactIds: normalizedContactIds });
    const selectedStatus = findTrueConfSdkStatusForContact(sdkStatuses, normalizedContactIds);
    if (!selectedStatus) {
        return null;
    }

    const resolvedContactId = normalizeTrueConfIdentifier(
        selectedStatus?.userId || normalizedContactIds[0] || '',
    );

    const contact = {
        user: {
            userId: resolvedContactId,
            login: resolvedContactId,
            status: selectedStatus?.status ?? null,
            extStatus: selectedStatus?.extStatus ?? null,
        },
    };

    return withTrueConfPresence({
        contact,
        userId: '',
        contactId: resolvedContactId,
        source: 'sdk',
    });
};

const requestTrueConfAddressBookContact = async ({
    accessToken,
    userId,
    contactId,
}) => {
    const requestUrl = new URL(
        buildTrueConfApiUrl(`/users/${encodeURIComponent(userId)}/addressbook/${encodeURIComponent(contactId)}`),
    );
    requestUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(requestUrl.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    });

    const payload = await parseTrueConfResponseJson(response);

    if (!response.ok) {
        const error = new Error('TrueConf addressbook request failed');
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload?.contact || null;
};

const requestTrueConfAddressBook = async ({
    accessToken,
    userId,
}) => {
    const requestUrl = new URL(
        buildTrueConfApiUrl(`/users/${encodeURIComponent(userId)}/addressbook`),
    );
    requestUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(requestUrl.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    });

    const payload = await parseTrueConfResponseJson(response);

    if (!response.ok) {
        const error = new Error('TrueConf addressbook list request failed');
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
};

const getTrueConfAddressBookItems = (payload) => {
    if (!payload) {
        return [];
    }

    if (Array.isArray(payload)) {
        return payload;
    }

    const listCandidates = [
        payload?.contacts,
        payload?.addressbook,
        payload?.users,
        payload?.items,
        payload?.result,
    ];

    for (const listCandidate of listCandidates) {
        if (Array.isArray(listCandidate)) {
            return listCandidate;
        }
    }

    return [];
};

const toTrueConfComparableIdentifier = (value) => String(value ?? '').trim().toLocaleLowerCase('en-US');

const collectTrueConfComparableIdentifiers = (entity) => {
    const identifiers = [];
    if (!entity || typeof entity !== 'object') {
        return identifiers;
    }

    [
        entity?.userId,
        entity?.userID,
        entity?.login,
        entity?.id,
        entity?.uid,
        entity?.username,
        entity?.name,
        entity?.user?.userId,
        entity?.user?.userID,
        entity?.user?.login,
        entity?.user?.id,
        entity?.user?.uid,
    ].forEach((value) => {
        const normalizedValue = toTrueConfComparableIdentifier(value);
        if (!normalizedValue) {
            return;
        }

        if (!identifiers.includes(normalizedValue)) {
            identifiers.push(normalizedValue);
        }
    });

    return identifiers;
};

const findTrueConfAddressBookItemByContactId = (payload, contactId) => {
    const normalizedContactId = toTrueConfComparableIdentifier(contactId);
    if (!normalizedContactId) {
        return null;
    }

    const addressBookItems = getTrueConfAddressBookItems(payload);
    for (const addressBookItem of addressBookItems) {
        const itemIdentifiers = collectTrueConfComparableIdentifiers(addressBookItem);
        if (itemIdentifiers.includes(normalizedContactId)) {
            return addressBookItem;
        }
    }

    return null;
};

const mergeTrueConfContacts = (primaryContact, fallbackContact) => {
    if (!primaryContact && !fallbackContact) {
        return null;
    }

    if (!fallbackContact) {
        return primaryContact;
    }

    if (!primaryContact) {
        return fallbackContact;
    }

    return {
        ...fallbackContact,
        ...primaryContact,
        user: {
            ...(fallbackContact?.user && typeof fallbackContact.user === 'object' ? fallbackContact.user : {}),
            ...(primaryContact?.user && typeof primaryContact.user === 'object' ? primaryContact.user : {}),
        },
    };
};

export const fetchTrueConfAddressBookContact = async ({
    userIds = [],
    contactIds = [],
} = {}) => {
    const normalizedUserIds = toUniqueTrueConfIdentifiers(userIds);
    const normalizedContactIds = toUniqueTrueConfIdentifiers(contactIds);

    if (!normalizedContactIds.length) {
        return null;
    }

    const sdkResponse = await requestTrueConfAddressBookContactViaSdk({
        contactIds: normalizedContactIds,
    });
    if (sdkResponse) {
        return sdkResponse;
    }

    if (!normalizedUserIds.length || !(await canUseTrueConfApi())) {
        return null;
    }

    const runRequestCycle = async (accessToken) => {
        for (const userId of normalizedUserIds) {
            for (const contactId of normalizedContactIds) {
                try {
                    const contact = await requestTrueConfAddressBookContact({
                        accessToken,
                        userId,
                        contactId,
                    });

                    if (contact) {
                        let resolvedContact = contact;
                        const resolvedPresence = extractTrueConfPresence(contact);
                        if (!Number.isFinite(Number(resolvedPresence?.extStatus))) {
                            try {
                                const addressBookPayload = await requestTrueConfAddressBook({
                                    accessToken,
                                    userId,
                                });
                                const extendedContact = findTrueConfAddressBookItemByContactId(addressBookPayload, contactId);
                                resolvedContact = mergeTrueConfContacts(contact, extendedContact);
                            } catch (addressBookError) {
                                const addressBookStatus = Number(addressBookError?.status);
                                if (
                                    addressBookStatus !== 400
                                    && addressBookStatus !== 401
                                    && addressBookStatus !== 403
                                    && addressBookStatus !== 404
                                ) {
                                    console.warn('TrueConf: failed to request full addressbook for extStatus', addressBookError);
                                }
                            }
                        }

                        return withTrueConfPresence({
                            contact: resolvedContact,
                            userId,
                            contactId,
                            source: 'api',
                        });
                    }
                } catch (error) {
                    const status = Number(error?.status);
                    if (status === 401) {
                        const unauthorizedError = new Error('TRUECONF_UNAUTHORIZED');
                        unauthorizedError.code = 'TRUECONF_UNAUTHORIZED';
                        throw unauthorizedError;
                    }

                    if (status === 400 || status === 403 || status === 404) {
                        continue;
                    }

                    throw error;
                }
            }
        }

        return null;
    };

    const accessToken = await getTrueConfAccessToken();
    if (!accessToken) {
        return null;
    }

    try {
        return await runRequestCycle(accessToken);
    } catch (error) {
        if (error?.code !== 'TRUECONF_UNAUTHORIZED') {
            throw error;
        }
    }

    const refreshedAccessToken = await getTrueConfAccessToken({ forceRefresh: true });
    if (!refreshedAccessToken) {
        return null;
    }

    try {
        return await runRequestCycle(refreshedAccessToken);
    } catch (error) {
        if (error?.code === 'TRUECONF_UNAUTHORIZED') {
            clearTrueConfTokens();
            return null;
        }

        throw error;
    }
};

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
        clearTrueConfTokens();
        const isLocalhost = window.location.hostname === 'localhost';
        let user = null;

        if (isLocalhost) {
            const response = await fetch(process.env.REACT_APP_API_URL + '/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    password,
                    mode: 'json',
                }),
            });

            if (!response.ok) {
                return null;
            }

            const result = await response.json();
            const accessToken = String(
                result?.data?.access_token
                || result?.data?.token
                || result?.access_token
                || '',
            ).trim();

            if (!accessToken) {
                console.error('Directus: loginEmail on localhost succeeded, but access_token is missing', result);
                return null;
            }

            directus.setToken(accessToken);
            user = result;
        } else {
            user = await directus.login(email, password);
        }

        try {
            await loginTrueConf(email, password);
        } catch (trueConfError) {
            clearTrueConfTokens();
            console.warn('TrueConf: failed to create token after loginEmail', trueConfError);
        }

        return user;
    } catch (e) {
        console.error(e)
    }

};

export const loginAD = async (login, password) => {
    try {
        clearTrueConfTokens();
        const isLocalhost = window.location.hostname === 'localhost';
        const authMode = isLocalhost ? 'json' : 'session';

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
                mode: authMode,
            })
        });
        if (response.ok) {
            const result = await response.json();
            if (isLocalhost) {
                const accessToken = String(
                    result?.data?.access_token
                    || result?.data?.token
                    || result?.access_token
                    || '',
                ).trim();

                if (!accessToken) {
                    console.error('Directus: loginAD on localhost succeeded, but access_token is missing', result);
                    return null;
                }

                directus.setToken(accessToken);
                console.log('localhost',result)
            }

            try {
                await loginTrueConf(login, password);
            } catch (trueConfError) {
                clearTrueConfTokens();
                console.warn('TrueConf: failed to create token after loginAD', trueConfError);
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
        // For localhost development we may work with token mode (no refresh cookie).
        if (window.location.hostname === 'localhost') {
            try {
                const directusToken = await directus.getToken?.();
                if (directusToken) {
                    return {
                        data: {
                            access_token: directusToken,
                        },
                    };
                }
            } catch (tokenReadError) {
                // Ignore and continue with refresh attempt below.
            }
        }

        const response = await fetch(process.env.REACT_APP_API_URL+'/auth/refresh', {
            method: 'POST',
            credentials: 'include', 
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'session' })
        });
        
        if (!response.ok) {
            if (response.status === 400 || response.status === 401) {
                return null;
            }

            const error = new Error('Token refresh failed');
            error.status = response.status;
            throw error;
        }
        
        const data = await response.json();
        return data;
    } catch (e) {
        if (e?.status !== 400 && e?.status !== 401) {
            console.error(e);
        }
        throw e;
    }
};

const normalizeStringValue = (value) => String(value ?? '').trim();

export const getCurrentUser = async (callOptions = {}) => {
    const { skipSessionExpiredRedirect } = normalizeDirectusCallOptions(callOptions);

    try {
        const user = await requestDirectus(readMe(), { skipSessionExpiredRedirect });
        if (!user) {
            throw new Error('Failed to get user data');
        }
        return user;
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const isUserInPolicyByName = async (userId, policyName, callOptions = {}) => {
    const normalizedUserId = normalizeStringValue(userId);
    const normalizedPolicyName = normalizeStringValue(policyName);
    const { skipSessionExpiredRedirect } = normalizeDirectusCallOptions(callOptions);

    if (!normalizedUserId || !normalizedPolicyName) {
        return false;
    }

    try {
        const policies = await requestDirectus(customEndpoint({
            path: '/policies',
            method: 'GET',
            params: {
                fields: ['id', 'name', { users: ['user'] }],
                filter: {
                    name: {
                        _eq: normalizedPolicyName,
                    },
                },
                limit: -1,
            },
        }), { skipSessionExpiredRedirect });

        const matchedPolicies = Array.isArray(policies) ? policies : [];

        return matchedPolicies.some((policy) => {
            const policyUsers = Array.isArray(policy?.users) ? policy.users : [];

            return policyUsers.some((policyUser) => {
                const candidateUserId = typeof policyUser === 'object'
                    ? (policyUser?.user?.id || policyUser?.user || policyUser?.id)
                    : policyUser;

                return normalizeStringValue(candidateUserId) === normalizedUserId;
            });
        });
    } catch (error) {
        console.error('Directus: failed to verify user policy membership', error);
        return false;
    }
};

export const fetchPhonebookDepartments = async () => {
    const data = await requestDirectus(readItems('LADP_departments', {
        fields: ['id', 'name', 'sort'],
        limit: -1,
    }), { skipSessionExpiredRedirect: true });

    return Array.isArray(data) ? data : [];
};

export const fetchPhonebookUsersByDepartment = async (departmentId) => {
    if (!departmentId) {
        return [];
    }

    const users = await requestDirectus(readUsers({
        fields: ['id', 'first_name', 'last_name', 'middleName', 'title', 'avatar', 'department', 'level', 'hiden'],
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
    }), { skipSessionExpiredRedirect: true });

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
    const users = await requestDirectus(readUsers({
        fields: [
            'id',
            'first_name',
            'last_name',
            'middleName',
            'title',
            'avatar',
            'hiden',
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
    }), { skipSessionExpiredRedirect: true });

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

    const users = await requestDirectus(readUsers({
        fields: [
            '*',
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
        limit: -1,
    }), { skipSessionExpiredRedirect: true });

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
    const response = await requestDirectus(uploadFiles(formData), { skipSessionExpiredRedirect: true });

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

    return requestDirectus(updateUser(userId, payload), { skipSessionExpiredRedirect: true });
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
            requestDirectus(readItems('Project_Card', {
                fields,
                filter,
                sort: [sort],
                page,
                limit
            })),
            // Отдельный запрос для получения общего количества с учетом фильтров
            requestDirectus(readItems('Project_Card', {
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
        requestDirectus(readItems('Project_Card', {
            groupBy: ['initiator'],
            filter: {
                initiator: { 
                    _nnull: true,
                    first_name: { _nnull: true }
                }
            }
        })),
        requestDirectus(readItems('Department', { fields: ['*'] })),
    ]);
    const uniqueInitiatorIds = initiatorIds.map(item => item.initiator).filter(Boolean);

    const Users = await requestDirectus(readUsers({
        fields: ['id', 'first_name', 'last_name'],
        filter: {
            id: {
                _in: uniqueInitiatorIds
            }
        },
        limit: -1
    }));
    return [Users, Department]
    
}

export const fetchInitGrade = async () => {
    try {
        const [presaleUsers, gradesData, allGradesWithUsers, averageGrades, closedMonths] = await Promise.all([
            requestDirectus(readItems('PresaleUsers', {
                fields: ['*', { user: ['id', 'first_name', 'last_name'] }]
            })),
            requestDirectus(readItems('gradePresale', {
                fields: ['*'],
                filter: {
                    user_created: {
                        _eq: '$CURRENT_USER'
                    }
                },
                sort: ['-date_created']
            })),
            requestDirectus(readItems('gradePresale', {
                fields: ['*', {
                    user_created: ['id', 'first_name', 'last_name'],
                    user_updated: ['id', 'first_name', 'last_name'],
                }],
                filter: {
                    dateGrade: {
                        _nnull: true
                    }
                },
                sort: ['-date_created']
            })),
            requestDirectus(readItems('gradePresale', {
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
            requestDirectus(readItems('closedGrades', {
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
            requestDirectus(readItem('Project_Card', ID ,{fields: fields})),
            requestDirectus(readItems('JobLimitation', { fields: ['name'] }))
        ]);

        return [data, limitation];
    } catch (error) {
        console.error(error);
        throw error; 
    }
};

export const fetchTemplate = async () => {
    try {
        const data = await requestDirectus(
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
        const data = await requestDirectus(
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
        const data = await requestDirectus(
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
        const result = await requestDirectus(
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
        const data = await requestDirectus(
            readUsers({
                fields: [
                    '*'
                ],
                limit: -1
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
        const item = await requestDirectus(readItem('Project_Card', data.id));
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
            const req = await requestDirectus(updateItem('Project_Card', id, savedata));
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
        const req = await requestDirectus(updateMe({
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
        const req = await requestDirectus(createItem('Project_Card', savedata));
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
    clearTrueConfTokens();
    const result = await directus.logout();
    return result;
};

export const uploadFilesDirectus = async (files) => {
    try {
        console.log(files);
        const uploadPromises = files.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await requestDirectus(uploadFiles(formData));
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
    const existingFiles = await requestDirectus(
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
        await requestDirectus(deleteFile(fileId));
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        throw error;
    }
};

// export const fetchGrades = async (userId) => {
//     try {
//         const grades = await requestDirectus(readItems('gradePresale', {
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
        const existingGrade = await requestDirectus(readItems('gradePresale', {
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
            return await requestDirectus(updateItem('gradePresale', existingGrade[0].id, {
                grade: grade
            }));
        } else {
            // Создаем новую оценку
            return await requestDirectus(createItem('gradePresale', {
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
        return await requestDirectus(createItem('closedGrades', {
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
        const closedMonth = await requestDirectus(readItems('closedGrades', {
            filter: {
                monthDate: {
                    _eq: month
                }
            },
            limit: 1
        }));
        
        if (closedMonth.length > 0) {
            await requestDirectus(deleteItem('closedGrades', closedMonth[0].id));
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const fetchAITemplates = async (departmentId) => {
    try {
        const templates = await requestDirectus(
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
        const lists = await requestDirectus(
            readItems('ListsKII', {
                fields: [
                    '*',
                    'okved.*',
                    'okved.ListKIIokvedNew_id.*'
                ],
                limit: -1,
                filter: {
                    okved: {
                        _some: {
                            ListKIIokvedNew_id: {
                                code: {
                                    _in: codesArray
                                }
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
        const lists = await requestDirectus(
            readItems('ListsKII', {
                fields: [
                    '*',
                    'okved.*',
                    'okved.ListKIIokvedNew_id.*'
                ],
                limit: -1,
                filter: {
                    okved: {
                        _some: {
                            ListKIIokvedNew_id: {
                                code: {
                                    _contains: String(code).trim()
                                }
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
        const records = await requestDirectus(
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
        return await requestDirectus(
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
        const chats = await requestDirectus(readItems('AI_Chats', {
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
        const chat = await requestDirectus(createItem('AI_Chats', {
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
        const messages = await requestDirectus(readItems('AI_Messages', {
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
        const message = await requestDirectus(createItem('AI_Messages', {
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
        await requestDirectus(updateItem('AI_Chats', chatId, {
            title
        }));
    } catch (error) {
        console.error('Ошибка при обновлении названия чата:', error);
        throw error;
    }
};

export const deleteChat = async (chatId) => {
    try {
        await requestDirectus(deleteItem('AI_Chats', chatId));
    } catch (error) {
        console.error('Ошибка при удалении чата:', error);
        throw error;
    }
};

// Функция для получения пользовательских настроек промптов
export const fetchUserPromptSettings = async () => {
    try {
        const settings = await requestDirectus(readItems('AI_User_Settings', {
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
            await requestDirectus(updateItem('AI_User_Settings', currentSettings.id, {
                system_prompt: systemPrompt,
                user_wrapper: userWrapper
            }));
        } else {
            await requestDirectus(createItem('AI_User_Settings', {
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
        const prompts = await requestDirectus(readItems('AI_System_Prompts', {
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
        const wrappers = await requestDirectus(readItems('AI_User_Prompt_Wrappers', {
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
        const prompts = await requestDirectus(readItems('AI_System_Prompts', {
            limit: 1
        }));

        if (prompts.length > 0) {
            await requestDirectus(updateItem('AI_System_Prompts', prompts[0].id, {
                prompt
            }));
        } else {
            await requestDirectus(createItem('AI_System_Prompts', {
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
        const wrappers = await requestDirectus(readItems('AI_User_Prompt_Wrappers', {
            limit: 1
        }));

        if (wrappers.length > 0) {
            await requestDirectus(updateItem('AI_User_Prompt_Wrappers', wrappers[0].id, {
                wrapper
            }));
        } else {
            await requestDirectus(createItem('AI_User_Prompt_Wrappers', {
                wrapper
            }));
        }
    } catch (error) {
        console.error('Ошибка при обновлении обертки промпта:', error);
        throw error;
    }
};

export default directus;
