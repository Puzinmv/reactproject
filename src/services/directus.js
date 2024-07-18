import { createDirectus, authentication, graphql, rest } from "@directus/sdk";

export const directus = createDirectus('http://10.0.0.226:8055')
    .with(authentication('cookie', { credentials: 'include' }))
//    .with(graphql({ credentials: 'include' }))
//    .with(rest({ credentials: 'include' }))
    ;
