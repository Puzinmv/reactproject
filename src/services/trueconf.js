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
                        return withTrueConfPresence({
                            contact,
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
